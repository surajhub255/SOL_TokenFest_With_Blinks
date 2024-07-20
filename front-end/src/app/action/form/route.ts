import { ActionGetResponse, ActionPostRequest, ActionPostResponse, ACTIONS_CORS_HEADERS } from "@solana/actions"

export async function GET(request: Request) {

    const payload: ActionGetResponse = {

        icon: new URL("/nav.png", new URL(request.url).origin).toString(),
        title: "TokenFest",
        description: "Create a proposal with Blinks",
        label: "Create a proposal",
    };

    return Response.json(payload,{
        headers: ACTIONS_CORS_HEADERS,
     });
}

export async function POST (request: Request){

    const requestBody: ActionPostRequest = await request.json();
    const userPubkey = requestBody.account;
    console.log(userPubkey);

    const payload: ActionPostResponse = {
        transaction: "",
        message: "hello " +userPubkey 
    };
    return Response.json(payload,{
        headers: ACTIONS_CORS_HEADERS,
     });
}

export async function OPTIONS (request: Request){
        return new Response(null, {
            headers: ACTIONS_CORS_HEADERS
        })
}
