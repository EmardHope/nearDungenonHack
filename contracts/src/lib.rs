#![deny(warnings)]
use hex;
use near_sdk::{
    borsh::{ self, BorshDeserialize, BorshSerialize },
    collections::{ UnorderedMap },
    env, near_bindgen, AccountId, PublicKey, Balance, Promise,
    json_types::{  U128, Base58PublicKey },
};
use serde::Serialize;

#[global_allocator]
static ALLOC: near_sdk::wee_alloc::WeeAlloc = near_sdk::wee_alloc::WeeAlloc::INIT;

const MINT_FEE:u128 = 1_000_000_000_000_000_000_000_000;
const GUEST_MINT_LIMIT:u8 = 3;

pub type TokenId = u64;


#[derive(Debug, Serialize, BorshDeserialize, BorshSerialize)]
pub struct TokenData {
    pub owner_id: AccountId,
    pub metadata: String,
    pub price: U128,
    ///NearDungeonHack Attributes
    pub job:u64,
    pub level:u64,
    pub exp:u64,
    pub gold:u64,
    pub skillpoints:u64,
    pub strength:u64,//0
    pub dexterity:u64,//1
    pub wisdom:u64,//2
}

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize)]
pub struct NearDungeonHack {
    pub pubkey_minted: UnorderedMap<PublicKey, u8>,
    pub token_to_data: UnorderedMap<TokenId, TokenData>,
    pub account_to_proceeds: UnorderedMap<AccountId, Balance>,
    pub owner_id: AccountId,
    pub token_id: TokenId,
}

impl Default for NearDungeonHack {
    fn default() -> Self {
        panic!("HeroNFT should be initialized before summon ! ")
    }
}

#[near_bindgen]
impl NearDungeonHack {
    #[init]
    pub fn new(owner_id: AccountId) -> Self {
        assert!(env::is_valid_account_id(owner_id.as_bytes()), "Owner's account ID is invalid.");
        assert!(!env::state_exists(), "Already initialized");
        Self {
            pubkey_minted: UnorderedMap::new(b"pubkey_minted".to_vec()),
            token_to_data: UnorderedMap::new(b"token_to_account".to_vec()),
            account_to_proceeds: UnorderedMap::new(b"account_to_proceeds".to_vec()),
            owner_id,
            token_id: 0,
        }
    }

    ///DungeonHack methods
    pub fn adventure(&mut self, token_id: TokenId) {
        let mut token_data = self.get_token_data(token_id);
        self.only_owner(token_data.owner_id.clone());
        //adventure logic
        token_data.exp = token_data.exp + 150 ;
        token_data.gold = token_data.gold + 15 ;
        if token_data.exp >= 1000*token_data.level {
            let increase_level = token_data.exp / (1000*token_data.level);
            let surplus_exp    = token_data.exp % (1000*token_data.level);
            token_data.level   = token_data.level + increase_level;
            token_data.exp     = surplus_exp;
            token_data.skillpoints = token_data.skillpoints + 5*increase_level;
        }
        self.token_to_data.insert(&token_id, &token_data);
    }

    pub fn add_points(&mut self, token_id: TokenId ,attributes_class:u64 ,allocation_points:u64) {
        let mut token_data = self.get_token_data(token_id);
        self.only_owner(token_data.owner_id.clone());
        //add_points logic
        if token_data.skillpoints >= allocation_points {
            if attributes_class == 0{
               token_data.strength = token_data.strength + allocation_points;
            }else if attributes_class == 1{
                     token_data.dexterity = token_data.dexterity + allocation_points;
            }else if attributes_class == 2{
                    token_data.wisdom = token_data.wisdom + allocation_points;
            }else{
                panic!("Don't cheat me ! ");
            }
            token_data.skillpoints = token_data.skillpoints - allocation_points;
            self.token_to_data.insert(&token_id, &token_data);
        }else{
            panic!("skillpoints is not enough ! ");
        }
        
    }



    /// NFT methods
    pub fn transfer(&mut self, new_owner_id: AccountId, token_id: TokenId) {
        let mut token_data = self.get_token_data(token_id);
        self.only_owner(token_data.owner_id.clone());
        token_data.owner_id = new_owner_id;
        self.token_to_data.insert(&token_id, &token_data);
    }

    pub fn set_price(&mut self, token_id: TokenId, amount: U128) {
        let mut token_data = self.get_token_data(token_id);
        self.only_owner(token_data.owner_id.clone());
        token_data.price = amount.into();
        self.token_to_data.insert(&token_id, &token_data);
    }

    /// token purchase - proceeds of sale in escrow for token owner
    #[payable]
    pub fn purchase(&mut self, new_owner_id: AccountId, token_id: TokenId) {
        let mut token_data = self.get_token_data(token_id);
        let price = token_data.price.into();
        assert!(price > 0, "not for sale");
        let deposit = env::attached_deposit();
        assert!(deposit == price, "deposit != price");
        // update proceeds balance
        let mut balance = self.account_to_proceeds.get(&token_data.owner_id).unwrap_or(0);
        balance = balance + deposit;
        self.account_to_proceeds.insert(&token_data.owner_id, &balance);
        // transfer ownership
        token_data.owner_id = new_owner_id;
        token_data.price = U128(0);
        self.token_to_data.insert(&token_id, &token_data);
    }

    /// owner of account where sale proceeds are escrowed can withdraw and transfer to another account
    pub fn withdraw(&mut self, account_id: AccountId, beneficiary: AccountId) {
        self.only_owner(account_id.clone());
        let proceeds = self.account_to_proceeds.get(&account_id).unwrap_or(0);
        assert!(proceeds > 0, "nothing to withdraw");
        self.account_to_proceeds.insert(&account_id, &0);
        Promise::new(beneficiary).transfer(proceeds);
    }

    /// Minting
    pub fn guest_mint(&mut self, owner_id: AccountId, metadata: String, job:u64) -> TokenId {
        self.only_contract_owner();

        let public_key:PublicKey = env::signer_account_pk().into();
        let num_minted = self.pubkey_minted.get(&public_key).unwrap_or(0) + 1;
        assert!(num_minted <= GUEST_MINT_LIMIT, "Out of free mints");
        self.pubkey_minted.insert(&public_key, &num_minted);

        self.mint(owner_id, metadata,job);
        self.token_id
    }

    #[payable]
    pub fn mint_token(&mut self, owner_id: AccountId, metadata: String, job:u64) -> TokenId {
        let deposit = env::attached_deposit();
        assert!(deposit == MINT_FEE, "deposit != price");
        self.mint(owner_id, metadata,job);
        self.token_id
    }

    /// mint token internal helper
    fn mint(&mut self, owner_id: AccountId, metadata: String , job:u64) {
        self.token_id = self.token_id + 1;
        let token_data = TokenData {
            owner_id,
            metadata,
            price: U128(0),
            job,
            level:1,
            exp:0,
            gold:1000,
            skillpoints:0,
            strength:5,
            dexterity:5,
            wisdom:5,
        };
        self.token_to_data.insert(&self.token_id, &token_data);
    }

    /// modifiers
    fn only_owner(&mut self, account_id:AccountId) {
        let signer = env::signer_account_id();
        if signer != account_id {
            let implicit_account_id:AccountId = hex::encode(&env::signer_account_pk()[1..]);
            if implicit_account_id != account_id {
                env::panic(b"Attempt to call transfer on tokens belonging to another account.")
            }
        }
    }

    fn only_contract_owner(&mut self) {
        assert_eq!(env::signer_account_id(), self.owner_id, "Only contract owner can call this method.");
    }

    /// View Methods

    pub fn get_pubkey_minted(&self, pubkey: Base58PublicKey) -> u8 {
        self.pubkey_minted.get(&pubkey.into()).unwrap_or(0)
    }

    pub fn get_proceeds(&self, owner_id: AccountId) -> U128 {
        self.account_to_proceeds.get(&owner_id).unwrap_or(0).into()
    }

    //return token_id:X 's TokenData {owner_id,metadata,price,job:u64,level,exp,gold,skill，points...},
    pub fn get_token_data(&self, token_id: TokenId) -> TokenData {
        match self.token_to_data.get(&token_id) {
            Some(token_data) => token_data,
            None => env::panic(b"No token exists")
        }
    }

    pub fn get_num_tokens(&self) -> TokenId {
        self.token_id
    }
}



// use the attribute below for unit tests
#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::MockedBlockchain;
    use near_sdk::{testing_env, VMContext};

    fn alice() -> AccountId {
        "alice.testnet".to_string()
    }
    fn bob() -> AccountId {
        "bob.testnet".to_string()
    }
    fn carol() -> AccountId {
        "carol.testnet".to_string()
    }
    fn metadata() -> String {
        "blah".to_string()
    }
    fn job() -> u64 {
        1
    }

    // part of writing unit tests is setting up a mock context
    // this is a useful list to peek at when wondering what's available in env::*
    fn get_context(predecessor_account_id: String, storage_usage: u64) -> VMContext {
        VMContext {
            current_account_id: alice(),
            signer_account_id: bob(),
            signer_account_pk: vec![0, 1, 2],
            predecessor_account_id,
            input: vec![],
            block_index: 0,
            block_timestamp: 0,
            account_balance: 0,
            account_locked_balance: 0,
            storage_usage,
            attached_deposit: 0,
            prepaid_gas: 10u64.pow(18),
            random_seed: vec![0, 1, 2],
            is_view: false,
            output_data_receivers: vec![],
            epoch_height: 19,
        }
    }

    #[test]
    fn mint_token_get_token_owner() {
        let mut context = get_context(bob(), 0);
        context.attached_deposit = MINT_FEE.into();
        testing_env!(context);
        let mut contract = NearDungeonHack::new(bob());
        let token_id = contract.mint_token(carol(), metadata(),job());
        let token_data = contract.get_token_data(token_id.clone());
        assert_eq!(carol(), token_data.owner_id, "Unexpected token owner.");
    }



    #[test]
    fn transfer_with_your_own_token() {
        // Owner account: bob.testnet
        // New owner account: alice.testnet

        let mut context = get_context(bob(), 0);
        context.attached_deposit = MINT_FEE.into();
        testing_env!(context);
        let mut contract = NearDungeonHack::new(bob());
        let token_id = contract.mint_token(bob(), metadata(),job());

        // bob transfers the token to alice
        contract.transfer(alice(), token_id.clone());

        // Check new owner
        let token_data = contract.get_token_data(token_id.clone());
        assert_eq!(alice(), token_data.owner_id, "Unexpected token owner.");
    }

    #[test]
    fn mint_purchase_withdraw() {
        let mut context = get_context(bob(), 0);
        context.attached_deposit = MINT_FEE.into();
        testing_env!(context.clone());
        let mut contract = NearDungeonHack::new(bob());
        let token_id = contract.mint_token(carol(), metadata(),job());
        let token_data = contract.get_token_data(token_id.clone());
        assert_eq!(carol(), token_data.owner_id, "Unexpected token owner.");

        context.signer_account_id = carol();
        testing_env!(context.clone());
        contract.set_price(token_id.clone(), MINT_FEE.into());
        
        context.signer_account_id = alice();
        context.attached_deposit = MINT_FEE.into();
        testing_env!(context.clone());
        contract.purchase(alice(), token_id.clone());

        let token_data = contract.get_token_data(token_id.clone());
        assert_eq!(alice(), token_data.owner_id, "Unexpected token owner.");
    }
}