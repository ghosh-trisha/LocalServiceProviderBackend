const Service = require('../models/Service');
const ServiceRequest = require('../models/ServiceRequest');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const User = require('../models/User');
const Review = require('../models/Review');
const Razorpay = require ('razorpay');
const Bill = require ('../models/bill');
const RazorpayPayment = require ('../models/RazorpayPayment');

exports.getServicesByType = catchAsync(async (req, res, next) => {
    const { service_name } = req.params;
    let { radius = 10 } = req.query; // Default radius 10km
  
    // Validate radius
    radius = Number(radius);
    if (isNaN(radius)) return next(new AppError('Invalid radius parameter', 400));
    if (radius <= 0) return next(new AppError('Radius must be greater than 0', 400));
  
    // 1. Get user's location
    const user = await User.findById(req.user.id);
    if (!user?.location?.coordinates) {
      return next(new AppError('User location not found', 400));
    }
  
    // 2. Perform geospatial query
    const services = await Service.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: user.location.coordinates
          },
          distanceField: 'distance',
          maxDistance: radius * 1000, // Convert km to meters
          spherical: true,
          query: { 
            name: service_name,
            parent_service: null // Only parent services
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'provider',
          foreignField: '_id',
          as: 'provider_info'
        }
      },
      {
        $unwind: '$provider_info'
      },
      {
        $project: {
          _id: 1,
          name: 1,
          price: 1,
          address: 1,
          provider: '$provider_info.name',
          distance: 1
        }
      }
    ]);
  
    res.status(200).json({
      status: 'success',
      results: services.length,
      data: services.map(s => ({
        service_id: s._id,
        name: s.name,
        provider: s.provider,
        price: s.price,
        address: s.address
      }))
    });
});

exports.filterServices = catchAsync(async (req, res, next) => {
    const { categories, price_range, location_radius } = req.body;
    const user = await User.findById(req.user.id);
  
    // Validate mandatory fields
    if (!categories || !Array.isArray(categories)) {
      return next(new AppError('Categories filter is required', 400));
    }
  
    // Set defaults
    const priceFilter = {
      min: price_range?.min || 0,
      max: price_range?.max || 1000
    };
  
    const radius = location_radius || 10; // Default 10 km
  
    // Validate numbers
    if (isNaN(radius) || radius <= 0) {
      return next(new AppError('Invalid location radius', 400));
    }
  
    if (isNaN(priceFilter.min) || isNaN(priceFilter.max) || priceFilter.min < 0 || priceFilter.max < 0) {
      return next(new AppError('Invalid price range', 400));
    }
  
    // Get user location
    if (!user?.location?.coordinates) {
      return next(new AppError('User location not available', 400));
    }
  
    // Build query
    const services = await Service.find({
      name: { $in: categories },
      price: { $gte: priceFilter.min, $lte: priceFilter.max },
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: user.location.coordinates
          },
          $maxDistance: radius * 1000
        }
      }
    }).populate('provider', 'name');
  
    res.status(200).json({
      status: 'success',
      results: services.length,
      data: services.map(service => ({
        service_id: service._id,
        name: service.name,
        price: service.price,
        address: service.address,
        provider: service.provider.name
      }))
    });
});

exports.getServiceDetails = catchAsync(async (req, res, next) => {
    const { id } = req.params;
  
    // 1. Find the main service with provider details
    const service = await Service.findById(id)
      .populate('provider', 'name')
      .populate('parent_service', 'name price');
  
    if (!service) {
      return next(new AppError('Service not found', 404));
    }
  
    // 2. Find child services
    const childServices = await Service.find({ parent_service: id })
      .select('_id name price');
  
    // 3. Format response
    const response = {
      service_id: service._id,
      name: service.name,
      description: service.description,
      price: service.price,
      provider: service.provider.name,
      address: service.address,
      child_services: childServices.map(child => ({
        service_id: child._id,
        name: child.name,
        price: child.price
      }))
    };
  
    res.status(200).json({
      status: 'success',
      data: response
    });
});

exports.createServiceRequest = catchAsync(async (req, res, next) => {
  const { service_id, time_slot } = req.body;

  // 1. Validate required fields
  if (!service_id || !time_slot) {
    return next(new AppError('Please provide service ID and time slot', 400));
  }

  // 2. Validate time slot
  const requestedTime = new Date(time_slot);
  if (requestedTime < Date.now()) {
    return next(new AppError('Time slot must be in the future', 400));
  }

  // 3. Check if service exists
  const service = await Service.findById(service_id);
  if (!service) {
    return next(new AppError('Service not found', 404));
  }

  // 4. Create service request
  const newRequest = await ServiceRequest.create({
    service: service_id,
    customer: req.user.id,
    time_slot: requestedTime,
    status: 'pending'
  });

  res.status(201).json({
    status: 'success',
    message: 'Service request sent successfully',
    request_id: newRequest._id
  });
});

exports.submitReview = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { rating, comment } = req.body;

  // 1. Validate input
  if (!rating || !comment) {
    return next(new AppError('Please provide both rating and comment', 400));
  }

  if (rating < 1 || rating > 5) {
    return next(new AppError('Rating must be between 1 and 5', 400));
  }

  // 2. Check service exists
  const service = await Service.findById(id);
  if (!service) {
    return next(new AppError('Service not found', 404));
  }

  // 3. Check for existing review
  const existingReview = await Review.findOne({
    service: id,
    customer: req.user.id
  });

  if (existingReview) {
    return next(new AppError('You have already reviewed this service', 400));
  }

  // 4. Create review
  await Review.create({
    service: id,
    customer: req.user.id,
    rating,
    comment
  });

  res.status(201).json({
    status: 'success',
    message: 'Review submitted successfully'
  });
});

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET
});

exports.processPayment = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  
  // 1. Validate input
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return next(new AppError('Missing payment verification details', 400));
  }

  // 2. Get service request and validate ownership
  const serviceRequest = await ServiceRequest.findById(id)
    .populate({
      path: 'customer',
      select: '_id'
    });

  if (!serviceRequest) {
    return next(new AppError('Service request not found', 404));
  }

  if (serviceRequest.customer._id.toString() !== req.user.id) {
    return next(new AppError('Not authorized to pay for this request', 403));
  }

  // 3. Get associated bill
  const bill = await Bill.findOne({ request: id });
  if (!bill) {
    return next(new AppError('No bill found for this request', 400));
  }

  // 4. Verify payment with Razorpay
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (generatedSignature !== razorpay_signature) {
    return next(new AppError('Invalid payment signature', 400));
  }

  // 5. Verify payment amount matches bill amount
  const order = await razorpay.orders.fetch(razorpay_order_id);
  if (order.amount !== bill.amount * 100) { // Convert to paise
    return next(new AppError('Payment amount mismatch', 400));
  }

  // 6. Check for existing payment
  const existingPayment = await RazorpayPayment.findOne({ razorpay_payment_id });
  if (existingPayment) {
    return next(new AppError('Duplicate payment detected', 400));
  }

  // 7. Create payment record
  await RazorpayPayment.create({
    bill: bill._id,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    payment_method: order.method,
    payment_status: 'captured'
  });

  // 8. Update bill status
  bill.status = 'paid';
  await bill.save();

  res.status(200).json({
    status: 'success',
    message: 'Payment successful'
  });
});