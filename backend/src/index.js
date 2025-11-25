exports.handler = async (event) => {
    console.log("Event received:", JSON.stringify(event, null, 2));

    return {
        statusCode: 200,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*", // Allow CORS
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        },
        body: JSON.stringify({
            message: "Hello from the backend! Your infrastructure is working.",
            timestamp: new Date().toISOString(),
            input: event.body ? JSON.parse(event.body) : null
        }),
    };
};
