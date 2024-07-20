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
    createMint, 
    createMintToInstruction, 
    getAssociatedTokenAddress, 
    createAssociatedTokenAccountInstruction 
} from "@solana/spl-token";

const SOLANA_DEVNET_RPC_URL = "https://api.devnet.solana.com";

export const GET = async (request: Request) => {
    const payload: ActionGetResponse = {
        icon: new URL("/nft.jpg", new URL(request.url).origin).toString(),
        title: "TokenFest",
        description: "🚀 Exciting news! TokenFest has just released new features, and our community has early access! 🎉 Join us now for exclusive rewards. Blink and get access to the platform today!",
        label: "Claim free NFT",
        links: {
            actions: [
                {
                    href: new URL("/action/form", new URL(request.url).origin).toString(),
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

        const connection = new Connection(SOLANA_DEVNET_RPC_URL);
        const payer = Keypair.generate();

        // Airdrop SOL to the payer
        const airdropSignature = await connection.requestAirdrop(
            payer.publicKey,
            2e9 // 2 SOL
        );
        await connection.confirmTransaction(airdropSignature);

        // Create a new mint for the NFT
        const mint = await createMint(
            connection,
            payer,
            payer.publicKey, // Mint authority
            payer.publicKey, // Freeze authority
            0 
        );

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
                payer.publicKey,
                associatedTokenAccount,
                account,
                mint
            );

            const transaction = new Transaction()
                .add(createAssociatedTokenAccountIx);
            transaction.feePayer = payer.publicKey;
            transaction.recentBlockhash = (
                await connection.getLatestBlockhash()
            ).blockhash;

            // Sign the transaction
            transaction.sign(payer);

            // Send and confirm the transaction
            await sendAndConfirmTransaction(connection, transaction, [payer], { skipPreflight: false, preflightCommitment: "confirmed" });
        }

        // Create the mint-to instruction to mint one NFT to the associated token account
        const mintToInstruction = createMintToInstruction(
            mint,
            associatedTokenAccount,
            payer.publicKey, // Mint authority
            1 // Amount
        );

        // Create the transaction and add the mint-to instruction
        const mintTransaction = new Transaction()
            .add(mintToInstruction);
        mintTransaction.feePayer = payer.publicKey;
        mintTransaction.recentBlockhash = (
            await connection.getLatestBlockhash()
        ).blockhash;

        // Sign the transaction
        mintTransaction.sign(payer);

        // Serialize and base64 encode the transaction
        const serializedTransaction = mintTransaction.serialize();
        const encodedTransaction = Buffer.from(serializedTransaction).toString('base64');

        const payload: ActionPostResponse = {
            transaction: encodedTransaction,
            message: "NFT minted successfully :)",
        };

        return new Response(JSON.stringify(payload), {
            headers: ACTIONS_CORS_HEADERS,
        });
    } catch (err) {
        console.error(err);

        let message = err;
        return new Response(JSON.stringify({ error: { message } }), {
            headers: ACTIONS_CORS_HEADERS,
        });
    }
}

export const OPTIONS = GET;
