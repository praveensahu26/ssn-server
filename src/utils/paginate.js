const paginate = async (Model, filter, page, limit, populate = []) => {
  let cursor = Model.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  populate.forEach(([path, select]) => {
    cursor = cursor.populate(path, select);
  });
  const [results, total] = await Promise.all([cursor, Model.countDocuments(filter)]);
  return { results, page, limit, total, totalPages: Math.ceil(total / limit) || 1 };
};

module.exports = paginate;
