//负责显示已有的NFT及其详情，分为Market 和 MyToken 两种 
import React, {useEffect, useState} from 'react';
import * as nearAPI from 'near-api-js';
import { GAS, parseNearAmount } from '../state/near';
import { 
	createAccessKeyAccount,
	accessKeyMethods,
	contractMethods,
	getContract,
	formatAccountId,
} from '../utils/near-utils';

const {
	KeyPair,
	utils: { format: { formatNearAmount } }
} = nearAPI;

export const Gallery = ({ near, signedIn, contractAccount, account, localKeys, loading, update }) => {
	if (!contractAccount) return null;

	const [fetching, setFetching] = useState(false);
	const [items, setItems] = useState([]);
	const [amount, setAmount] = useState('');
	const [PointsClass, setPointsClass] = useState('0');
	const [PointsAmount,setPointsAmount] = useState('');
	//默认显示界面：1 为market , 2 为 Mytoken
	const [filter, setFilter] = useState(1);

	useEffect(() => {
		if (!fetching && !loading) loadItems();
	}, [loading]);


	const loadItems = async () => {
		setFetching(true);
		const contract = getContract(contractAccount);
		//获取当前的token总数
		const num_tokens = await contract.get_num_tokens();
		const newItems = [];
		//遍历每个token的信息 TokenData {owner_id,metadata,price,job:u64,level,exp,gold,skill，points...},
		for (let i = 1; i <= num_tokens; i++) {
			const data = await contract.get_token_data({
				token_id: i
			});
			newItems.push({
				...data,
				token_id: i
			});
		}
		//array反向，从新到旧
		newItems.reverse();
		setItems(newItems);
		console.log('loaded items', newItems);
		setFetching(false);
	};

	//购买
	const handlePurchase = async (token_id) => {
		update('loading', true);
		console.log(token_id);
		const contract = getContract(account);
		const item = items.find(({ token_id: id }) => token_id === id);
		await contract.purchase({
			new_owner_id: account.accountId,
			token_id: token_id
		}, GAS, item.price);
		await loadItems();
		update('loading', false);
	};

	//出售
	const handleSetPrice = async (token_id) => {
		update('loading', true);
		let appAccount = account;
		let methods = contractMethods;
		if (!appAccount) {
			appAccount = createAccessKeyAccount(near, KeyPair.fromString(localKeys.accessSecret));
			methods = accessKeyMethods;
		}
		const contract = getContract(appAccount, methods);
		try {
            await contract.set_price({
                token_id: token_id,
                amount: parseNearAmount(amount)
            }, GAS);
        } catch(e) {
            console.warn(e)
        }

		await loadItems();
		update('loading', false);
	};

	//冒险
	const handleAdventure = async (token_id) => {
		update('loading', true);
		let appAccount = account;
		let methods = contractMethods;
		if (!appAccount) {
			appAccount = createAccessKeyAccount(near, KeyPair.fromString(localKeys.accessSecret));
			methods = accessKeyMethods;
		}
		const contract = getContract(appAccount, methods);
		try {
            await contract.adventure({
                token_id: token_id
            }, GAS);
        } catch(e) {
            console.warn(e)
        }

		await loadItems();
		update('loading', false);
	};

	//加点 add_points(&mut self, token_id: TokenId ,attributes_class:u64 ,allocation_points:u64)
	const handleAddPoints = async (token_id) => {
		update('loading', true);
		let appAccount = account;
		let methods = contractMethods;
		if (!appAccount) {
			appAccount = createAccessKeyAccount(near, KeyPair.fromString(localKeys.accessSecret));
			methods = accessKeyMethods;
		}
		const contract = getContract(appAccount, methods);
		try {
            await contract.add_points({
                token_id: token_id,
				attributes_class:parseInt(PointsClass),
				allocation_points:parseInt(PointsAmount),
            }, GAS);
        } catch(e) {
            console.warn(e)
        }

		await loadItems();
		update('loading', false);
	};


	let accountId;
	if (account) accountId = account.accountId;
	if (localKeys) accountId = localKeys.accessAccountId;

	let market = [], mine = [];
	//如果用户已登录：
	if (signedIn) {
		market = items.filter(({ owner_id }) => owner_id !== accountId);
		mine = items.filter(({ owner_id }) => owner_id === accountId);
	} else {
		//如果用户未登录：
		market = items;
    }

	//setFilter(1)显示Market ,setFilter(2)显示本人
	return <>
		{signedIn && <div className="filters">
			<button onClick={() => setFilter(2)} style={{ width:120, background: filter === 2 ? '#FFB259' : '',top:350,left: 810,position:"fixed"}}>My Hero🙋</button>
			<button onClick={() => setFilter(1)} style={{ width:120, background: filter === 1 ? '#FFB259' : '',top:420,left: 810,position:"fixed"}}>Market💰</button>

		</div>}
		{
			///filter赋值为1， 首页默认1显示market，修改为2 则默认显示本人。显示其名下所有NFT
			(filter === 1 ? market : mine).map(({ metadata, owner_id, price, token_id, job,level,exp,gold,skillpoints,strength,dexterity,wisdom }) => <div key={token_id} className="item">
				<img class="column" src={metadata} />
				{/*(filter === 1 || price !== '0') &&<div className="line"></div>*/}
		
				<div class="column">
						{<h3>Owner👑: {formatAccountId(owner_id)}</h3>}
						{<p>job👷: {job}</p>}
						{<p>level🏆: {level}</p>}
						{<p>exp📜: {exp}</p>}
						{<p>gold💰: {gold}</p>}
				</div>
				<div class="column">
						{<p>skillpoints⚡: {skillpoints}</p>}
						{<p>strength💪: {strength}</p>}
						{<p>dexterity💨: {dexterity}</p>}
						{<p>wisdom✨: {wisdom}</p>}
				</div>

				
						{/*购买他人的NFT*/}
						{
							//如果该NFT标记的有价格，则提供购买按钮
							price !== '0' && <>
								<h3>Price {formatNearAmount(price, 2)}</h3>
								{
									account && <button style={{position:"absolute",bottom:5,right: 5,}} onClick={() => handlePurchase(token_id)}>Purchase</button>
								}
							</>
						}
						{/*如果是自己的NFT ,则提供出售按钮*/}
						{/**/}
						{filter === 2 && <>
								<button class="addpoint" onClick={() => handleAdventure(token_id)}>Advanture!⚔️</button>
								<input class="addpoint" style={{width:100}} placeholder="attr:0-1-2" value={PointsClass} onChange={(e) => setPointsClass(e.target.value)} />
								<input class="addpoint" style={{width:118}} placeholder="Points:number" value={PointsAmount} onChange={(e) => setPointsAmount(e.target.value)} />
								<button class="addpoint" onClick={() => handleAddPoints(token_id)}>Add Point!⚡</button>																				
								<p>
								<input class="market" style={{width:150}} placeholder="Price (Near)" value={amount} onChange={(e) => setAmount(e.target.value)} />
								<button class="market" onClick={() => handleSetPrice(token_id)}>Set Price for Sale💰</button>
								</p>
						</>}
						{/*奇怪，加上这一行，market的布局反而不会被打乱*/}
						
						{price == '0' && filter === 1 && <>

							<h3>not set Price</h3>
							
						</>}
					
			</div>)
		}
	</>;
};

