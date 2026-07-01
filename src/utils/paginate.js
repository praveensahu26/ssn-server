const paginate = async (Model, filter, page, limit, populate = [], sort = { createdAt: -1 }) => {
  let cursor = Model.find(filter)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit);
  populate.forEach(([path, select]) => {
    cursor = cursor.populate(path, select);
  });
  const [results, total] = await Promise.all([cursor, Model.countDocuments(filter)]);
  return { results, page, limit, total, totalPages: Math.ceil(total / limit) || 1 };
};

module.exports = paginate;
