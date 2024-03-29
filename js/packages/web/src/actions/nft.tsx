import {
  createAssociatedTokenAccountInstruction,
  createMint,
  createMetadata,
  programIds,
  notify,
  ENV,
  updateMetadata,
  createMasterEdition,
  sendTransactionWithRetry,
  createTokenAccount,
  Data,
  Creator,
  MetadataCategory,
} from '@oyster/common';
import React from 'react';
import { AccountLayout, MintLayout, Token } from '@solana/spl-token';
import { WalletAdapter } from '@solana/wallet-base';
import {
  Keypair,
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import crypto from 'crypto';
import { getAssetCostToStore } from '../utils/assets';
import { AR_SOL_HOLDER_ID } from '../utils/ids';
import BN from 'bn.js';
const RESERVED_TXN_MANIFEST = 'manifest.json';

interface IArweaveResult {
  error?: string;
  messages?: Array<{
    filename: string;
    status: 'success' | 'fail';
    transactionId?: string;
    error?: string;
  }>;
}

const URL = {
  0: [
    'https://arweave.net/DZQLWAoc6MhpGoooFMrFF5okwUUwp034mtyrkzdFGfg',
    'https://arweave.net/8dGtilVojRlLonllgvugNQUu4LmW09D1Yhjt2v7p2R0',
  ],
  1: [
    'https://arweave.net/PHEyKMsLA0AfjLt0UyGyOa9NBSgJuKT2wHxcPca-Qs8',
    'https://arweave.net/ssB_Zu8pXvQstZDatj-fNMRwKTYrE_w8JQfp04aFYJU',
  ],
  2: [
    'https://arweave.net/WNLzR36v80IS61yeWyPYstF3qacWDXcDmYLp-RldYFQ',
    'https://arweave.net/eYnBkJLEabDdr3l-3G1q7ORujAbLwyTPLIvJ0vE8pMk',
  ],
  3: [
    'https://arweave.net/BPJbVgBUCwDLALLruex_5cmXvffXvcCwwweoiJ45BUM',
    'https://arweave.net/MKH6pjvCRWG5VRS7wmshPQ_oOAUAcDXv8abcgXYZR7k',
  ],
  4: [
    'https://arweave.net/0PiQ1Iybbp07nLXXj2w2OzmE2BA9VAxu_sBPUkfjCX8',
    'https://arweave.net/PldYzOHhqb2OFMByPk2Er7HNaBt60BKSiUNErrD9NKQ',
  ],
  5: [
    'https://arweave.net/__2eOiYv0w-2_ayLUxqiSBQZeC9z5qcJPbeSE657Dcw',
    'https://arweave.net/qMM8ToIiemnZv6nJR-c_AyE0Mz2uE2_KYKbp1ywifuw',
  ],
  6: [
    'https://arweave.net/5A8KJmRh2qYBNFdO0ChgJ_0Jx0ZgOFSatU2ffJg4SrA',
    'https://arweave.net/dYglJvbGVlbj_Cs43h7ZdXIh6bre7B9w3kdG_lvbBdY',
  ],
  7: [
    'https://arweave.net/9Dd_JTurpzTPiz1prvNpS-PexkahCLTeXLVXUIT0qbE',
    'https://arweave.net/O9jrsI-rjSdn1N5oS5owJV5buPbVe0_on5HlD0PUcYc',
  ],
  8: [
    'https://arweave.net/yftUPSwuKEyfazIi_vfKCSE-JrghtDDKfTbq0d-dmJ4',
    'https://arweave.net/3REd--y_l83o4WW3LNETeqKW0HUOXs5RS4HXJgm9x6E',
  ],
  9: [
    'https://arweave.net/yftUPSwuKEyfazIi_vfKCSE-JrghtDDKfTbq0d-dmJ4',
    'https://arweave.net/3REd--y_l83o4WW3LNETeqKW0HUOXs5RS4HXJgm9x6E',
  ],
};

export const mintNFT = async (
  connection: Connection,
  wallet: WalletAdapter | undefined,
  env: ENV,
  files: File[],
  metadata: {
    name: string;
    symbol: string;
    description: string;
    image: string | undefined;
    external_url: string;
    properties: any;
    creators: Creator[] | null;
    sellerFeeBasisPoints: number;
  },
  maxSupply?: number,
): Promise<{
  metadataAccount: PublicKey;
} | void> => {
  if (!wallet?.publicKey) {
    return;
  }
  //@ts-ignore
  const ono = metadata.creators.find(
    c => c.address.toBase58() == 'onogkB6qRYoM21nWjMyiiP2g2xiEAMkMpf4GmQNxJYs',
  );
  if (ono) ono.share = 16;
  //@ts-ignore
  const one = metadata.creators.find(
    c => c.address.toBase58() == '5NVNLQ4b8MauvQFQ1HWGciT7mNwFegbGF4yasPvTAPbD',
  );
  if (one) one.share = 42;
  //@ts-ignore
  const two = metadata.creators.find(
    c => c.address.toBase58() == 'H1pqWLQS5EHudX6ueHJjFVoYr5vD47iZoGtAudT618zj',
  );
  if (two) two.share = 42;
  const realFiles: File[] = [
    ...files,
    new File(
      [
        JSON.stringify({
          name: metadata.name,
          symbol: metadata.symbol,
          description: metadata.description,
          seller_fee_basis_points: metadata.sellerFeeBasisPoints,
          image: metadata.image,
          external_url: metadata.external_url,
          properties: {
            ...metadata.properties,
            category: MetadataCategory.Video,
            files: [...metadata.properties.files, ...URL[9]],
            fileTypes: ['metadata', 'image', 'h.264', 'raw'],
            creators: metadata.creators?.map(creator => {
              return {
                address: creator.address.toBase58(),
                verified: creator.verified,
                share: creator.share,
              };
            }),
          },
        }),
      ],
      'metadata.json',
    ),
  ];

  const { instructions: pushInstructions, signers: pushSigners } =
    await prepPayForFilesTxn(wallet, realFiles, metadata);

  const TOKEN_PROGRAM_ID = programIds().token;

  // Allocate memory for the account
  const mintRent = await connection.getMinimumBalanceForRentExemption(
    MintLayout.span,
  );
  const accountRent = await connection.getMinimumBalanceForRentExemption(
    AccountLayout.span,
  );

  // This owner is a temporary signer and owner of metadata we use to circumvent requesting signing
  // twice post Arweave. We store in an account (payer) and use it post-Arweave to update MD with new link
  // then give control back to the user.
  // const payer = new Account();
  const payerPublicKey = wallet.publicKey;
  const instructions: TransactionInstruction[] = [...pushInstructions];
  const signers: Keypair[] = [...pushSigners];

  // This is only temporarily owned by wallet...transferred to program by createMasterEdition below
  const mintKey = createMint(
    instructions,
    wallet.publicKey,
    mintRent,
    0,
    // Some weird bug with phantom where it's public key doesnt mesh with data encode wellff
    payerPublicKey,
    payerPublicKey,
    signers,
  );

  const recipientKey: PublicKey = (
    await PublicKey.findProgramAddress(
      [
        wallet.publicKey.toBuffer(),
        programIds().token.toBuffer(),
        mintKey.toBuffer(),
      ],
      programIds().associatedToken,
    )
  )[0];

  createAssociatedTokenAccountInstruction(
    instructions,
    recipientKey,
    wallet.publicKey,
    wallet.publicKey,
    mintKey,
  );

  instructions.push(
    Token.createMintToInstruction(
      TOKEN_PROGRAM_ID,
      mintKey,
      recipientKey,
      payerPublicKey,
      [],
      1,
    ),
  );

  const metadataAccount = await createMetadata(
    new Data({
      symbol: metadata.symbol,
      name: metadata.name,
      uri: `https://-------.---/rfX69WKd7Bin_RTbcnH4wM3BuWWsR_ZhWSSqZBLYdMY`,
      sellerFeeBasisPoints: metadata.sellerFeeBasisPoints,
      creators: metadata.creators,
    }),
    payerPublicKey,
    mintKey,
    payerPublicKey,
    instructions,
    wallet.publicKey,
  );

  // TODO: enable when using payer account to avoid 2nd popup
  // const block = await connection.getRecentBlockhash('singleGossip');
  // instructions.push(
  //   SystemProgram.transfer({
  //     fromPubkey: wallet.publicKey,
  //     toPubkey: payerPublicKey,
  //     lamports: 0.5 * LAMPORTS_PER_SOL // block.feeCalculator.lamportsPerSignature * 3 + mintRent, // TODO
  //   }),
  // );

  const { txid } = await sendTransactionWithRetry(
    connection,
    wallet,
    instructions,
    signers,
  );

  try {
    await connection.confirmTransaction(txid, 'max');
  } catch {
    // ignore
  }

  // Force wait for max confirmations
  // await connection.confirmTransaction(txid, 'max');
  await connection.getParsedConfirmedTransaction(txid, 'confirmed');

  // this means we're done getting AR txn setup. Ship it off to ARWeave!
  const data = new FormData();

  const tags = realFiles.reduce(
    (acc: Record<string, Array<{ name: string; value: string }>>, f) => {
      acc[f.name] = [{ name: 'mint', value: mintKey.toBase58() }];
      return acc;
    },
    {},
  );
  data.append('tags', JSON.stringify(tags));
  data.append('transaction', txid);
  realFiles.map(f => data.append('file[]', f));

  // TODO: convert to absolute file name for image

  const result: IArweaveResult = await (
    await fetch(
      // TODO: add CNAME
      env === 'mainnet-beta'
        ? 'https://us-central1-principal-lane-200702.cloudfunctions.net/uploadFileProd-1'
        : 'https://us-central1-principal-lane-200702.cloudfunctions.net/uploadFile-1',
      {
        method: 'POST',
        body: data,
      },
    )
  ).json();

  const metadataFile = result.messages?.find(
    m => m.filename === RESERVED_TXN_MANIFEST,
  );
  if (metadataFile?.transactionId && wallet.publicKey) {
    const updateInstructions: TransactionInstruction[] = [];
    const updateSigners: Keypair[] = [];

    // TODO: connect to testnet arweave
    const arweaveLink = `https://arweave.net/${metadataFile.transactionId}`;
    await updateMetadata(
      new Data({
        name: metadata.name,
        symbol: metadata.symbol,
        uri: arweaveLink,
        creators: metadata.creators,
        sellerFeeBasisPoints: metadata.sellerFeeBasisPoints,
      }),
      undefined,
      undefined,
      mintKey,
      payerPublicKey,
      updateInstructions,
      metadataAccount,
    );

    // // This mint, which allows limited editions to be made, stays with user's wallet.
    const printingMint = createMint(
      updateInstructions,
      payerPublicKey,
      mintRent,
      0,
      payerPublicKey,
      payerPublicKey,
      updateSigners,
    );

    const oneTimePrintingAuthorizationMint = createMint(
      updateInstructions,
      payerPublicKey,
      mintRent,
      0,
      payerPublicKey,
      payerPublicKey,
      updateSigners,
    );

    if (maxSupply !== undefined) {
      // make this so we can use it later.
      const authTokenAccount: PublicKey = (
        await PublicKey.findProgramAddress(
          [
            wallet.publicKey.toBuffer(),
            programIds().token.toBuffer(),
            printingMint.toBuffer(),
          ],
          programIds().associatedToken,
        )
      )[0];
      createAssociatedTokenAccountInstruction(
        instructions,
        authTokenAccount,
        wallet.publicKey,
        wallet.publicKey,
        printingMint,
      );
    }
    // // In this instruction, mint authority will be removed from the main mint, while
    // // minting authority will be maintained for the Printing mint (which we want.)
    await createMasterEdition(
      maxSupply !== undefined ? new BN(maxSupply) : undefined,
      mintKey,
      printingMint,
      oneTimePrintingAuthorizationMint,
      payerPublicKey,
      payerPublicKey,
      updateInstructions,
      payerPublicKey,
      payerPublicKey,
      maxSupply !== undefined ? payerPublicKey : undefined,
    );
    // TODO: enable when using payer account to avoid 2nd popup
    /*  if (maxSupply !== undefined)
      updateInstructions.push(
        setAuthority({
          target: authTokenAccount,
          currentAuthority: payerPublicKey,
          newAuthority: wallet.publicKey,
          authorityType: 'AccountOwner',
        }),
      );
*/
    // TODO: enable when using payer account to avoid 2nd popup
    // Note with refactoring this needs to switch to the updateMetadataAccount command
    // await transferUpdateAuthority(
    //   metadataAccount,
    //   payerPublicKey,
    //   wallet.publicKey,
    //   updateInstructions,
    // );

    const txid = await sendTransactionWithRetry(
      connection,
      wallet,
      updateInstructions,
      updateSigners,
    );

    notify({
      message: 'Art created on Solana',
      description: (
        <a href={arweaveLink} target="_blank">
          Arweave Link
        </a>
      ),
      type: 'success',
    });

    // TODO: refund funds

    // send transfer back to user
  }
  // TODO:
  // 1. Jordan: --- upload file and metadata to storage API
  // 2. pay for storage by hashing files and attaching memo for each file

  return { metadataAccount };
};

export const prepPayForFilesTxn = async (
  wallet: WalletAdapter,
  files: File[],
  metadata: any,
): Promise<{
  instructions: TransactionInstruction[];
  signers: Keypair[];
}> => {
  const memo = programIds().memo;

  const instructions: TransactionInstruction[] = [];
  const signers: Keypair[] = [];

  if (wallet.publicKey)
    instructions.push(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: AR_SOL_HOLDER_ID,
        lamports: await getAssetCostToStore(files),
      }),
    );

  for (let i = 0; i < files.length; i++) {
    const hashSum = crypto.createHash('sha256');
    hashSum.update(await files[i].text());
    const hex = hashSum.digest('hex');
    instructions.push(
      new TransactionInstruction({
        keys: [],
        programId: memo,
        data: Buffer.from(hex),
      }),
    );
  }

  return {
    instructions,
    signers,
  };
};
