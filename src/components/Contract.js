//该组件负责显示 mint 等与合约交互的地方 , f12显示 div id = Contract 
import React, {useEffect, useState} from 'react';
import * as nearAPI from 'near-api-js';
import { GAS, parseNearAmount } from '../state/near';
import { 
	accessKeyMethods,
	createAccessKeyAccount,
	getContract,
} from '../utils/near-utils';

const {
	KeyPair,
} = nearAPI;

export const Contract = ({ near, update, localKeys = {}, account }) => {
	if (!account && !localKeys.signedIn) return null;

	const [metadata, setMetadata] = useState('');
	const [freebies, setFreebies] = useState(0);
    
	const checkFreebies = async () => {
		let appAccount = account;
		if (appAccount) return;
		appAccount = createAccessKeyAccount(near, KeyPair.fromString(localKeys.accessSecret));
		const contract = getContract(appAccount, accessKeyMethods);
		setFreebies(await contract.get_pubkey_minted({
			pubkey: localKeys.accessPublic
		}) + 1);
	};
	useEffect(checkFreebies, []);
	//random(1,1999)
	function random(min, max) {
		return Math.floor(Math.random() * (max - min)) + min;   
	  }

	const handleMint = async () => {
		var randomNum = random(1,1999);
		var ImageURL  = "https://xdaipunks.com/punks/"+ randomNum.toString() +".png";
		if (!metadata.length) {
			alert('Please enter job !');
			return;
		}
		update('loading', true);
		let appAccount = account;
		let accountId, deposit;
		if (!appAccount) {
			appAccount = createAccessKeyAccount(near, KeyPair.fromString(localKeys.accessSecret));
			accountId = localKeys.accessAccountId;
		} else {
			accountId = account.accountId;
			deposit = parseNearAmount('1');
		}
        
		const contract = getContract(appAccount);
		await contract[!account ? 'guest_mint' : 'mint_token']({
			metadata:ImageURL,
			owner_id: accountId,
			/////////////add
			job:parseInt(metadata),
		}, GAS, deposit);
		checkFreebies();
		update('loading', false);
        setMetadata('')
	};

	//该组件负责显示 mint , f12显示 div id = Contract <input placeholder="Metadata (Image URL)" value={metadata} onChange={(e) => setMetadata(e.target.value)} />
	return <>
		<h2>[ Mint Your Hero ]</h2>
		<p>Job code:<br /></p>
		<p>Fighter:1,
			Paladin:2,
			Wizard:3,
			Ranger:4,
			Rouge:5,
			Cleric:6</p>
		{ 
			!account ? <>
				{
					freebies > 0 && <>{
						freebies < 4 ? <>
							<p>{freebies} / 3 Free Mint</p>
							<input style={{width:190}} placeholder="Input job:1-2-3-4-5-6" value={metadata} onChange={(e) => setMetadata(e.target.value)} />
							<button style={{width:190}} onClick={() => handleMint()}>Mint💎</button>
						</> :
							<p>You are out of free mints 😭</p>
					}</>
				}
			</> :
				<>
					<input style={{width:190}} placeholder="Input job:1-2-3-4-5-6" value={metadata} onChange={(e) => setMetadata(e.target.value)} />
					<button style={{width:190}} onClick={() => handleMint()}>Mint💎</button>
				</>
		}
	</>;
};

