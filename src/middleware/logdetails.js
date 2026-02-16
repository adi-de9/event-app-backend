export const logDetails = (req, res, next) => {
  res.on('finish', () => {
    console.log(`${req.method} ${req.url} - Status: ${res.statusCode}`);
  });
  next();
};
