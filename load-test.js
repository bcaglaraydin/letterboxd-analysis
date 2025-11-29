const https = require('https');
// Require SDK from backend node_modules
const { DynamoDBClient, ScanCommand, BatchWriteItemCommand } = require('./backend/node_modules/@aws-sdk/client-dynamodb');

const client = new DynamoDBClient({ region: 'eu-west-1' });
const endpoint = 'https://mpnd4bu9jg.execute-api.eu-west-1.amazonaws.com';
const TABLE_NAME = 'Films';

function request(path, method, body) {
    return new Promise((resolve, reject) => {
        const url = new URL(endpoint + path);
        const options = {
            hostname: url.hostname,
            path: url.pathname,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data: data }));
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function clearTable() {
    console.log(`Clearing table ${TABLE_NAME}...`);
    try {
        // 1. Scan for all keys
        let items = [];
        let lastEvaluatedKey = undefined;
        do {
            const command = new ScanCommand({
                TableName: TABLE_NAME,
                ProjectionExpression: 'slug',
                ExclusiveStartKey: lastEvaluatedKey,
            });
            const response = await client.send(command);
            if (response.Items) {
                items = items.concat(response.Items);
            }
            lastEvaluatedKey = response.LastEvaluatedKey;
        } while (lastEvaluatedKey);

        if (items.length === 0) {
            console.log('Table is empty.');
            return;
        }

        console.log(`Found ${items.length} items. Deleting in batches of 25...`);

        // 2. Batch Delete
        const chunks = [];
        for (let i = 0; i < items.length; i += 25) {
            chunks.push(items.slice(i, i + 25));
        }

        let deletedCount = 0;
        for (const chunk of chunks) {
            const deleteRequests = chunk.map(item => ({
                DeleteRequest: { Key: item }
            }));

            const command = new BatchWriteItemCommand({
                RequestItems: {
                    [TABLE_NAME]: deleteRequests
                }
            });

            try {
                await client.send(command);
                deletedCount += chunk.length;
                process.stdout.write(`\rDeleted ${deletedCount}/${items.length}`);
            } catch (err) {
                console.error('\nBatch delete failed:', err.message);
            }
        }
        console.log('\nTable cleared.');
    } catch (e) {
        console.error('Failed to clear table:', e);
    }
}

async function run() {
    console.log('Starting Load Test...');

    await clearTable();

    const start = Date.now();

    // Test Scrape Trigger
    try {
        console.log('Triggering Scrape...');
        const res = await request('/', 'POST', { username: 'bcaglaraydin' });
        console.log('Scrape Response:', res.status, res.data);
    } catch (e) {
        console.error('Scrape Failed:', e);
    }

    // Wait a bit for workers to process
    console.log('Waiting 5s for workers...');
    await new Promise(r => setTimeout(r, 5000));

    // Test Metrics
    try {
        console.log('Fetching Metrics...');
        const res = await request('/metrics', 'POST', {
            users: [{
                username: 'bcaglaraydin',
                films: [
                    { slug: 'dune-2021', rating: 4 },
                    { slug: 'the-batman', rating: 5 }
                ]
            }]
        });
        console.log('Metrics Response:', res.status, res.data);
    } catch (e) {
        console.error('Metrics Failed:', e);
    }

    console.log('Load Test Completed in', Date.now() - start, 'ms');
}

run();
