import { 
    ActionGetResponse, 
    ActionPostRequest, 
    ActionPostResponse, 
    ACTIONS_CORS_HEADERS 
} from "@solana/actions";
import { 
    Connection, 
    PublicKey, 
    Transaction, 
    Keypair, 
    sendAndConfirmTransaction 
} from "@solana/web3.js";
import { 
    createMintToInstruction, 
    getAssociatedTokenAddress, 
    createAssociatedTokenAccountInstruction 
} from "@solana/spl-token";

const SOLANA_MAINNET_RPC_URL = "https://api.mainnet-beta.solana.com";
const EXISTING_MINT_ADDRESS = "ECba6s4MnqD6dF7U42Grj5HvStwyC5FhjxciXMe59ih2"; // Existing NFT mint address

export const GET = async (request: Request) => {
    const payload: ActionGetResponse = {
        icon: new URL("/nft.jpg", new URL(request.url).origin).toString(),
        title: "TokenFest",
        description: "🚀 Exciting news! TokenFest has just released new features, and our community has early access! 🎉 Join us now for exclusive rewards. Blink and get access to the platform today!",
        label: "Claim free NFT",
        links: {
            actions: [
                {
                    href: new URL("/action/form", new URL(request.url).origin).toString(),  // Update with the correct endpoint
                    label: "Claim free NFT",
                },
                {
                    href: "https://example.com",  // Replace with actual link
                    label: "Link to Website",
                },
            ],
        },
    };

    return new Response(JSON.stringify(payload), {
        headers: ACTIONS_CORS_HEADERS,
    });
}

export const POST = async (req: Request) => {
    try {
        const body: ActionPostRequest = await req.json();

        let account: PublicKey;
        try {
            account = new PublicKey(body.account);
        } catch (err) {
            throw new Error("Invalid 'account' provided. It's not a real pubkey");
        }

        const connection = new Connection(SOLANA_MAINNET_RPC_URL);

        const mint = new PublicKey(EXISTING_MINT_ADDRESS);

        // Get or create an associated token account for the NFT
        const associatedTokenAccount = await getAssociatedTokenAddress(
            mint,
            account,
            true
        );

        const tokenAccountInfo = await connection.getAccountInfo(associatedTokenAccount);
        if (!tokenAccountInfo) {
            // Create the associated token account if it doesn't exist
            const createAssociatedTokenAccountIx = createAssociatedTokenAccountInstruction(
                account, // Fee payer (user's account)
                associatedTokenAccount,
                account,
                mint
            );

            const transaction = new Transaction().add(createAssociatedTokenAccountIx);
            transaction.feePayer = account;
            transaction.recentBlockhash = (await connection.getLatestBlockhash({commitment:"finalized"})).blockhash;

            // Serialize and base64 encode the transaction
            const serializedTransaction = transaction.serialize({
                requireAllSignatures: false,
                verifySignatures: false
            }).toString("base64");

            const payload: ActionPostResponse = {
                transaction: serializedTransaction,  // Pass the base64 encoded transaction here
                message: "Please sign the transaction to create an associated token account.",
            };

            return new Response(JSON.stringify(payload), {
                headers: ACTIONS_CORS_HEADERS,
            });
        }

        // Create the mint-to instruction to mint one NFT to the associated token account
        const mintToInstruction = createMintToInstruction(
            mint,
            associatedTokenAccount,
            account, // Fee payer (user's account)
            1 // Amount
        );

        // Create the transaction and add the mint-to instruction
        const mintTransaction = new Transaction().add(mintToInstruction);
        mintTransaction.feePayer = account;
        mintTransaction.recentBlockhash = (await connection.getLatestBlockhash({commitment:"finalized"})).blockhash;

        // Send and confirm the transaction
        const serializedTransaction = mintTransaction.serialize({
            requireAllSignatures: false,
            verifySignatures: false
        }).toString("base64");

        // Check if the transaction was confirmed
        const confirmationStrategy = {
            serializedTransaction,
            blockhash: mintTransaction.recentBlockhash,
            lastValidBlockHeight: (await connection.getLatestBlockhash({commitment:"finalized"})).lastValidBlockHeight,
        };

        const payload: ActionPostResponse = {
            transaction: serializedTransaction,  // Pass the transaction signature here
            message: "Minting done successfully.",
        };

        return new Response(JSON.stringify(payload), {
            headers: ACTIONS_CORS_HEADERS,
        });

    } catch (err) {
        console.error(err); // Log the error to the console for debugging

        let message = err instanceof Error ? err.message : String(err);
        return new Response(JSON.stringify({ error: { message } }), {
            headers: ACTIONS_CORS_HEADERS,
        });
    }
}

export const OPTIONS = GET;
