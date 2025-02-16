module.exports = {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  
    // Token generation options
    options: {
      issuer: 'LocalServiceProvider',
      audience: 'allUser',
      algorithm: 'HS256'
    }
  };