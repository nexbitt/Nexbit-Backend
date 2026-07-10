import 'dotenv/config';
import http from 'http';

const testBuffer = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
const boundary = '----TestBoundary123';

const header = '--' + boundary + '\r\n' +
    'Content-Disposition: form-data; name="imagen"; filename="test.gif"\r\n' +
    'Content-Type: image/gif\r\n\r\n';
const footer = '\r\n--' + boundary + '--\r\n';

const headerBuf = Buffer.from(header, 'utf8');
const footerBuf = Buffer.from(footer, 'utf8');
const body = Buffer.concat([headerBuf, testBuffer, footerBuf]);

const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/uploads/cloudinary',
    method: 'POST',
    headers: {
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Content-Length': body.length
    }
}, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Response:', data);
    });
});
req.write(body);
req.end();
