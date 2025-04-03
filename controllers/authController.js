const User = require('../models/User');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const Session = require('../models/Session')

exports.register = catchAsync(async (req, res, next) => {
  const {
    name,
    email,
    password,
    phone_number,
    role,
    location_latitude,
    location_longitude,
    address
  } = req.body;

  // Validate required fields
  if (!name || !email || !password || !phone_number || !role ||
    !location_latitude || !location_longitude || !address) {
    return next(new AppError('Please provide all required fields', 400));
  }

  // Validate coordinates
  if (isNaN(location_latitude) || isNaN(location_longitude)) {
    return next(new AppError('Invalid coordinates', 400));
  }

  // Validate role
  if (!['customer', 'provider'].includes(role)) {
    return next(new AppError('Invalid user role', 400));
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('User already exists with this email', 400));
  }

  // Create new user
  const newUser = await User.create({
    name,
    email,
    password,
    phone_number,
    role,
    location: {
      type: 'Point',
      coordinates: [parseFloat(location_longitude), parseFloat(location_latitude)]
    },
    address
  });

  // Remove password from output
  newUser.password = undefined;

  res.status(201).json({
    status: 'success',
    message: 'User registered successfully',
    user_id: newUser._id
  });
});


exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1. Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  // 2. Check if user exists and password is correct
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.matchPassword(password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // 3. Generate JWT token using your config
  const token = jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    jwtConfig.secret,
    {
      expiresIn: jwtConfig.expiresIn,
      issuer: jwtConfig.options.issuer,
      audience: jwtConfig.options.audience,
      algorithm: jwtConfig.options.algorithm
    }
  );

  // 4. Create a new session
  await Session.create({
    user: user._id,
    ip: req.ip, // Get IP address from request
    userAgent: req.get('User-Agent') // Get user agent from request headers
  });

  // 5. Remove password from output
  user.password = undefined;

  // 6. Send response with token
  res.status(200).json({
    status: 'success',
    message: 'Login successful',
    accessToken: token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});


exports.logout = catchAsync(async (req, res, next) => {
  // 1. Find the active session for the user
  const session = await Session.findOneAndUpdate(
    { user: req.user.id, active: true }, // Find active session
    { logoutTime: Date.now(), active: false }, // Update logout time and set inactive
    { new: true } // Return the updated session
  );

  if (!session) {
    return next(new AppError('No active session found', 404));
  }

  // 2. Send response
  res.status(200).json({
    status: 'success',
    message: 'Logout successful'
  });
});


exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1. Get user from request
  const { new_password } = req.body;

  if (!new_password) {
    return next(new AppError('Please provide a new password', 400));
  }

  // 2. Find user and update password
  const user = await User.findById(req.user.id).select('+password');
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // 3. Update password (pre-save hook will handle hashing )
  user.password = new_password;
  await user.save();

  // 4. Send response
  res.status(200).json({
    status: 'success',
    message: 'Password reset successful'
  });
});