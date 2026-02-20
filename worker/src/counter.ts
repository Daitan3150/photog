
export class PhotoCounter {
    state: DurableObjectState;

    constructor(state: DurableObjectState, env: Env) {
        this.state = state;
    }

    async fetch(request: Request) {
        const url = new URL(request.url);

        // Get current value
        let value: number = (await this.state.storage.get("value")) || 0;

        if (url.pathname === "/increment") {
            value += 1;
            await this.state.storage.put("value", value);
        }

        return new Response(JSON.stringify({ value }), {
            headers: { "Content-Type": "application/json" },
        });
    }
}

interface Env {
    // bindings
}
