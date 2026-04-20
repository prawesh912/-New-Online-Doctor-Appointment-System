export const verifyRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user?.role) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: No role found"
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: Insufficient role"
            });
        }

        next();
    };
};