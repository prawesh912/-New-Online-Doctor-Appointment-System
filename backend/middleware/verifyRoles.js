import ROLES from "../constants/roles.js";

export const verifyRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user?.role) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: No role found"
            });
        }

        // Admin can access any role-gated route
        if (req.user.role === ROLES.ADMIN || allowedRoles.includes(req.user.role)) {
            return next();
        }

        return res.status(403).json({
            success: false,
            message: "Forbidden: Insufficient role"
        });
    };
};