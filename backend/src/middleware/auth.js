// 认证中间件（占位实现，实际项目中需要实现 JWT 验证）
function authenticate(req, res, next) {
  // 开发环境允许无认证
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    req.user = { id: '1', name: 'Admin', email: 'admin@example.com' };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: '未提供认证令牌'
    });
  }

  const token = authHeader.substring(7);
  // JWT 验证逻辑
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: '无效的认证令牌'
    });
  }
}

// 权限检查中间件
function requirePermission(permission) {
  return (req, res, next) => {
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      return next();
    }

    const userPermission = typeof permission === 'function' ? permission(req, res) : permission;

    // 权限检查逻辑
    const hasPermission = true; // 实际项目中需要从数据库查询用户权限

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: '没有足够的权限'
      });
    }

    next();
  };
}

module.exports = {
  authenticate,
  requirePermission
};
