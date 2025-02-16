const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/appError');
const jwtConfig = require('../config/jwt');
const catchAsync = require('../utils/catchAsync'); // Import catchAsync

exports.authenticate = catchAsync(async (req, res, next) => {
  // 1. Get token from headers or cookies
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } 

  if (!token) {
    return next(new AppError('You are not logged in! Please log in to get access.', 401));
  }

  // 2. Verify token
  const decoded = jwt.verify(token, jwtConfig.secret, {
    issuer: jwtConfig.options.issuer,
    audience: jwtConfig.options.audience,
    algorithms: [jwtConfig.options.algorithm]
  });

  // 3. Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('The user belonging to this token no longer exists.', 401));
  }

 
  // 4. Grant access and attach user to request
  req.user = currentUser;
  
  next();
});

exports.customerRoleAuthenticate=catchAsync(async (req,res,next)=>{
    if(req.user&&req.user.role=="customer"){
        next();
    }else{
        next(new AppError('Not a valid user role to hit this API', 400))
    }
})

exports.providerRoleAuthenticate=catchAsync(async (req,res,next)=>{
    if(req.user&&req.user.role=="provider"){
        next();
    }else{
        next(new AppError('Not a valid user role to hit this API', 400))
    }
})