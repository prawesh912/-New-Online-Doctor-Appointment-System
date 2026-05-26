import axios from 'axios';

export async function verifyKhaltiPayment(pidx){
    const headersList = {
        "Authorization": `Key ${process.env.KHALTI_SECRET_KEY}`,
        "Content-Type": "application/json"
    };

    const bodyContent = JSON.stringify({ pidx });

    const reqOptions = {
        url: `${process.env.KHALTI_GATEWAY_URL}/api/v2/epayment/lookup/`,
        method: "POST",
        headers: headersList,
        data: bodyContent
    };

    try{
        const response = await axios.request(reqOptions);
        return response.data;
    }catch (err){
        console.error("Error verifying khalti payment:", err);
        throw err;
    }
}

export async function initializeKhaltiPayment(details){
    const headersList = {
        "Authorization": `Key ${process.env.KHALTI_SECRET_KEY}`,
        "Content-Type": "application/json"
    };

    const bodyContent = JSON.stringify(details);

    const reqOptions = {
        url: `${process.env.KHALTI_GATEWAY_URL}/api/v2/epayment/initiate/`,
        method: "POST",
        headers: headersList,
        data: bodyContent
    };

    try{
        const response = await axios.request(reqOptions);
        return response.data;
    }catch (err){
        console.error("Error initializing khalti payment:", err);
        throw err;
    }
}