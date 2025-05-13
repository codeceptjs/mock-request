const fs = require('fs');
const path = require('path');
const { output } = require('codeceptjs');

class PlaywrightConnector {
    constructor(Playwright, options = {}) {
        if (!Playwright.page) throw new Error('Playwright page must be initialized');

        this.Playwright = Playwright;
        this.page = Playwright.page;
        this.options = options;
        this.routes = [];
        this.connected = false;

        this.recordingsDir = options.recordingsDir || './data/requests';
        this.recording = false;
        this.replaying = false;
        this.recordedRequests = [];
        this.replayMap = new Map();
        this.title = '';
    }

    async connect(title = 'default-session') {
        if (this.connected) return;

        this.title = title;

        await this.page.route('**/*', async (route, request) => {
            const url = request.url();
            const method = request.method();

            // REPLAY mode
            if (this.replaying) {
                const key = `${method}:${url}`;
                if (this.replayMap.has(key)) {
                    const response = this.replayMap.get(key);
                    output.debug(`Replayed ➞ ${method} ${url}`);
                    return route.fulfill({
                        status: response.status,
                        headers: response.headers,
                        body: response.body,
                    });
                }
            }

            // Mock route
            for (const handler of this.routes) {
                if (handler.method === method &&
                    handler.urls.some(u => new RegExp(u).test(url))) {
                    output.debug(`Mocked ➞ ${method} ${url}`);
                    return handler.callback(route, request);
                }
            }

            // Passthrough (with optional recording)
            const response = await this.page.request.fetch(request);
            const body = await response.body();

            if (this.recording) {
                const record = {
                    method,
                    url,
                    status: response.status(),
                    headers: response.headers(),
                    body: body.toString(),
                };
                this.recordedRequests.push(record);
                output.debug(`Recorded ➞ ${method} ${url}`);
            }

            return route.fulfill({
                status: response.status(),
                headers: response.headers(),
                body,
            });
        });

        this.connected = true;
    }

    async isConnected() {
        return this.connected;
    }

    async checkConnection() {
        if (!this.connected) {
            await this.connect();
        }
    }

    async mockRequest(method, oneOrMoreUrls, dataOrStatusCode, additionalData = null) {
        const urls = Array.isArray(oneOrMoreUrls) ? oneOrMoreUrls : [oneOrMoreUrls];

        const callback = (route, _) => {
            if (typeof dataOrStatusCode === 'number') {
                const status = dataOrStatusCode;
                const body = additionalData ? JSON.stringify(additionalData) : undefined;
                return route.fulfill({
                    status,
                    contentType: 'application/json',
                    body,
                });
            } else {
                const body = JSON.stringify(dataOrStatusCode);
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body,
                });
            }
        };

        this.routes.push({ method, urls, callback });
    }

    async mockServer(configFn) {
        await configFn(this.page);
    }

    async record(title = this.title) {
        this.recording = true;
        this.title = title;
        this.recordedRequests = [];
    }

    async replay(title = this.title) {
        this.replaying = true;
        this.title = title;

        const filePath = path.join(this.recordingsDir, `${title}.json`);
        if (!fs.existsSync(filePath)) {
            throw new Error(`Replay file not found: ${filePath}`);
        }

        const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));
        this.replayMap.clear();
        for (const req of data) {
            const key = `${req.method}:${req.url}`;
            this.replayMap.set(key, {
                status: req.status,
                headers: req.headers,
                body: Buffer.from(req.body),
            });
        }
    }

    async flush() {
        if (!this.recording || !this.recordedRequests.length) return;

        const filePath = path.join(this.recordingsDir, `${this.title}.json`);
        await fs.mkdir(this.recordingsDir, { recursive: true });
        await fs.writeFile(filePath, JSON.stringify(this.recordedRequests, null, 2));

        output.log(`Saved recording: ${filePath}`);
        this.recording = false;
        this.recordedRequests = [];
    }

    async disconnect() {
        try {
            await this.page.unroute('**/*');
            this.routes = [];
            this.replaying = false;
            this.recording = false;
            this.recordedRequests = [];
            this.replayMap.clear();
            this.connected = false;
        } catch (err) {
            output.log('Error during Playwright disconnect:', err.message);
        }
    }
}

module.exports = PlaywrightConnector;