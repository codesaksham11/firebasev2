export async function onRequest(context) {
    const { request } = context;
    const body = await request.json();
    const { level, code } = body;

    const validCodes = {
        see: 'ILSSMTICDAFH',
        basic: 'IKSDLMBIWSLHLM',
        ktm: 'EIWMSTLIWTHINL'
    };

    if (validCodes[level] === code) {
        return new Response(JSON.stringify({ status: 'accepted' }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } else {
        return new Response(JSON.stringify({ status: 'invalid' }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
