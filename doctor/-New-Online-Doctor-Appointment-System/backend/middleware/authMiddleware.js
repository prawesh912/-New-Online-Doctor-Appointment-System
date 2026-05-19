export const authMiddleware = (req, res, next) => {
    if (!req.session.user) return res.status(401).json({ message: 'Unauthorized. Please login first.' });
    next()
};

export function authRole(role) {
    return (req, res, next) => {
        if (req.user.role !== role) {
            res.status(401)
            return res.send('Not allowed')
        }
        next()
    }
}