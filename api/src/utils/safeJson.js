function safeJson(data, status = 200) {
  return {
    data,
    timestamp: new Date().toISOString()
  };
}

module.exports = { safeJson };
