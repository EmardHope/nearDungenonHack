import React, { useContext, useEffect, useState } from 'react';

import { appStore, onAppMount } from './state/app';

import { Wallet } from './components/Wallet';
import { Contract } from './components/Contract';
import { Keys } from './components/Keys';
import { Gallery } from './components/Gallery';

import Avatar from 'url:./img/avatar.jpg';
import NearLogo from 'url:./img/near_icon.svg';
import Fight from 'url:./img/fight.jpg';

import './App.scss';

const App = () => {
	const { state, dispatch, update } = useContext(appStore);//useContext可以帮助我们跨越组件层级直接传递变量，实现共享
	console.log("-------------------state------------------------")
    console.log(state)//本页面已经拥有了accountId，wallet，balance 等对象

    //从state中接收wallet等对象，f12可以查询到
	const { near, wallet, contractAccount, account, localKeys, loading } = state;
    
	//创建一个 profile 的状态变量，创建一个setProfile()的函数用于后续修改 profile 
	const [profile, setProfile] = useState(false);

	//dispatch的使用？相当于异步调用
	const onMount = () => {
		dispatch(onAppMount());
	};
	useEffect(onMount, []);

	//定义变量 signedIn
	const signedIn = ((wallet && wallet.signedIn) || (localKeys && localKeys.signedIn));
	let accountId = '';
	if (signedIn) {
		accountId = account ? account.accountId : 'Please Login';
	}

	//显示账户信息？
	if (profile && !signedIn) {
		setProfile(false);
	}
    
	//loading的时候显示等待图案，并旋转
	return <>
	<div id="title" style={{top:0,left: 805,position:"fixed","z-index":9999}}>
	<h1>Near🔮</h1>
	<h1> Dungeon⚔️</h1>
	<h1>Hack⚡</h1>
	</div>
		{ loading && <div className="loading">
			<img src={Fight} />
		</div>
		}
        
		<div id="menu">
			<div>
				<div>
					<img style={{width: 150 , opacity: signedIn ? 1 : 0.25 }} src={Avatar} 
						onClick={() => setProfile(!profile)}
					/>
				</div>
				<div>
				
					{/* !signedIn ? <Wallet {...{ wallet }} /> : accountId 登录显示a,没登陆显示b*/ }
					<Wallet {...{ wallet }} />
				</div>
			</div>
		</div>

		{
			profile && signedIn && <div id="profile">
				<div>
					{
						wallet && wallet.signedIn && <Wallet {...{ wallet, account, update, dispatch, handleClose: () => setProfile(false) }} />
					}
					{
						localKeys && localKeys.signedIn && <Keys {...{ near, update, localKeys }} />
					}
				</div>
			</div>
		}

		{/*加载conponents里面的组件 Keys */}
		{ !signedIn &&
            <div id="guest">
            	<>
            		{/*<Keys {...{ near, update, localKeys }} />*/}
					<p>Please connect your NEAR wallet !</p>
            	</>
            </div>
		}

		{/*加载conponents里面的组件 Contract */}
		{ signedIn &&
            <div id="contract">
            	{
            		signedIn &&
                    <Contract {...{ near, update, localKeys, wallet, account }} />
            	}
            </div>
		}

		{/*加载conponents里面的组件 Gallery */}
		<div id="gallery">
			<Gallery {...{ near, signedIn, contractAccount, account, localKeys, loading, update }} />
		</div>
	</>;
};

export default App;
