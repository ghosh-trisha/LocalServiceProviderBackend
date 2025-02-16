const Service = require('../models/Service');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const ServiceRequest = require('../models/ServiceRequest');
const Bill = require('../models/Bill');

exports.createService = catchAsync(async (req, res, next) => {
  const {
    name,
    description,
    price,
    location_latitude,
    location_longitude,
    address,
    parent_service
  } = req.body;

  // Validate required fields
  if (!name || !price || !location_latitude || !location_longitude || !address) {
    return next(new AppError('Please provide all required fields', 400));
  }

  // Validate coordinates
  if (isNaN(location_latitude) || isNaN(location_longitude)) {
    return next(new AppError('Invalid coordinates', 400));
  }

  // Validate price
  if (price <= 0) {
    return next(new AppError('Price must be greater than 0', 400));
  }

  // Check parent service exists if provided
  if (parent_service) {
    const parentService = await Service.findById(parent_service);
    if (!parentService) {
      return next(new AppError('Parent service not found', 404));
    }
  }

  // Create new service
  const newService = await Service.create({
    name,
    description,
    price,
    provider: req.user.id,
    location: {
      type: 'Point',
      coordinates: [
        parseFloat(location_longitude),
        parseFloat(location_latitude)
      ]
    },
    address,
    parent_service
  });

  res.status(201).json({
    status: 'success',
    message: 'Service created successfully',
    service_id: newService._id
  });
});

exports.updateService = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const {
    name,
    description,
    price,
    location_latitude,
    location_longitude,
    address,
    parent_service
  } = req.body;

  // 1. Find the service
  const service = await Service.findById(id);
  if (!service) {
    return next(new AppError('Service not found', 404));
  }

  // 2. Verify ownership
  if (service.provider.toString() !== req.user.id) {
    return next(new AppError('Not authorized to update this service', 403));
  }

  // 3. Prepare update data
  const updateData = {};
  if (name) updateData.name = name;
  if (description) updateData.description = description;
  if (price) {
    if (price <= 0) return next(new AppError('Price must be greater than 0', 400));
    updateData.price = price;
  }
  if (address) updateData.address = address;

  // 4. Handle location update
  if (location_latitude && location_longitude) {
    if (isNaN(location_latitude) || isNaN(location_longitude)) {
      return next(new AppError('Invalid coordinates', 400));
    }
    updateData.location = {
      type: 'Point',
      coordinates: [
        parseFloat(location_longitude),
        parseFloat(location_latitude)
      ]
    };
  }

  // 5. Handle parent service
  if (parent_service) {
    const parentService = await Service.findById(parent_service);
    if (!parentService) return next(new AppError('Parent service not found', 404));
    updateData.parent_service = parent_service;
  }

  // 6. Perform update
  const updatedService = await Service.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    status: 'success',
    message: 'Service updated successfully',
    data: {
      service: updatedService
    }
  });
});

exports.deleteService = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // 1. Find the service
  const service = await Service.findById(id);
  if (!service) {
    return next(new AppError('Service not found', 404));
  }

  // 2. Verify ownership
  if (service.provider.toString() !== req.user.id) {
    return next(new AppError('Not authorized to delete this service', 403));
  }

  // 3. Delete the service
  await Service.findByIdAndDelete(id);

  res.status(200).json({
    status: 'success',
    message: 'Service deleted successfully'
  });
});

exports.acceptRequest = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // 1. Find the service request and populate service details
  const serviceRequest = await ServiceRequest.findById(id)
    .populate({
      path: 'service',
      select: 'provider'
    });

  if (!serviceRequest) {
    return next(new AppError('Service request not found', 404));
  }

  // 2. Verify ownership
  if (serviceRequest.service.provider.toString() !== req.user.id) {
    return next(new AppError('Not authorized to accept this request', 403));
  }

  // 3. Check if request is already accepted/completed
  if (serviceRequest.status !== 'pending') {
    return next(new AppError(`Request is already ${serviceRequest.status}`, 400));
  }

  // 4. Update the request status
  serviceRequest.status = 'accepted';
  await serviceRequest.save();

  res.status(200).json({
    status: 'success',
    message: 'Service request accepted'
  });
});

exports.rejectRequest = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // 1. Find the service request with service provider details
  const serviceRequest = await ServiceRequest.findById(id)
    .populate({
      path: 'service',
      select: 'provider'
    });

  if (!serviceRequest) {
    return next(new AppError('Service request not found', 404));
  }

  // 2. Verify provider ownership
  if (serviceRequest.service.provider.toString() !== req.user.id) {
    return next(new AppError('Not authorized to reject this request', 403));
  }

  // 3. Validate request status
  if (serviceRequest.status !== 'pending') {
    return next(new AppError(`Cannot reject ${serviceRequest.status} request`, 400));
  }

  // 4. Update request status
  serviceRequest.status = 'rejected';
  await serviceRequest.save();

  res.status(200).json({
    status: 'success',
    message: 'Service request rejected'
  });
});

exports.generateBill = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { amount } = req.body;

  // 1. Validate input
  if (!amount || amount <= 0) {
    return next(new AppError('Please provide a valid amount greater than 0', 400));
  }

  // 2. Find the service request with provider details
  const serviceRequest = await ServiceRequest.findById(id)
    .populate({
      path: 'service',
      select: 'provider'
    });

  if (!serviceRequest) {
    return next(new AppError('Service request not found', 404));
  }

  // 3. Verify provider ownership
  if (serviceRequest.service.provider.toString() !== req.user.id) {
    return next(new AppError('Not authorized to generate bill for this request', 403));
  }

  // 4. Check request status
  if (serviceRequest.status !== 'accepted') {
    return next(new AppError('Bill can only be generated for accepted requests', 400));
  }

  // 5. Check if bill already exists
  const existingBill = await Bill.findOne({ request: id });
  if (existingBill) {
    return next(new AppError('Bill already exists for this request', 400));
  }

  // 6. Create new bill
  const newBill = await Bill.create({
    request: id,
    amount,
    status: 'unpaid'
  });

  res.status(201).json({
    status: 'success',
    message: 'Bill generated successfully',
    bill_id: newBill._id
  });
});