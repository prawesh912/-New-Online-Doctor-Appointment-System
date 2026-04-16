export const test = async (req, res) => {
    try {
        return res.status(200).json({message: `Test Successful ${process.pid}`});
    } catch (err) {
        return res.status(500).json({err: err.message});
    }
}