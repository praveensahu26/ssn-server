const pick = (object, keys) =>
  keys.reduce((obj, key) => {
    if (object && Object.prototype.hasOwnProperty.call(object, key)) {
      return { ...obj, [key]: object[key] };
    }
    return obj;
  }, {});

module.exports = pick;
