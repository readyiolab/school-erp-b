const sanitizeValue = (value) => {
  if (typeof value === 'string') {
    return value.replace(/[<>]/g, '').trim();
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === 'object') {
    return Object.keys(value).reduce((accumulator, key) => {
      accumulator[key] = sanitizeValue(value[key]);
      return accumulator;
    }, {});
  }

  return value;
};

const sanitizeMiddleware = (req, res, next) => {
  req.body = sanitizeValue(req.body);
  req.query = sanitizeValue(req.query);
  req.params = sanitizeValue(req.params);
  next();
};

module.exports = sanitizeMiddleware;
