import { TokenAccount, useUserAccounts, useWallet } from '@oyster/common';
import { SafetyDepositDraft } from '../actions/createAuctionManager';
import { useMeta } from '../contexts';
import { PublicKey } from '@solana/web3.js';

export const useCreatorArts = (id?: PublicKey | string) => {
  const { metadata } = useMeta();
  const filtered = metadata.filter(
    m =>
      (m.info.data.creators?.findIndex(c => c.address.toBase58() === id) ||
        -1) >= 0,
  );

  return filtered;
};
