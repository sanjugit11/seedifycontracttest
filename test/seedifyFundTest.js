const { assert } = require('chai');
const truffleAssert = require('truffle-assertions');

const SMD = artifacts.require('./SeedifyFundsContract.sol');
const Token = artifacts.require('./InitializableERC20.sol');

require('chai')
    .use(require('chai-as-promised'))
    .should();

contract('SMD', (accounts) => {
    let instance, token;
    const totalSupply = 200000000000000000000;
    let currentTime = Math.floor(Date.now()/1000);
    let eachTierSupply = 10000000000000000000;
    before(async() => {
        token = await Token.new()
        await token.init(accounts[0], totalSupply.toString(), "BUSD", "LP", 18);
        instance = await SMD.new("100000000000000000000", currentTime + 30, currentTime + 60, accounts[1], eachTierSupply.toString(), eachTierSupply.toString(), eachTierSupply.toString(), eachTierSupply.toString(), eachTierSupply.toString(), eachTierSupply.toString(), eachTierSupply.toString(), eachTierSupply.toString(), eachTierSupply.toString(), 3, token.address);
    })

    describe('Deployment', async() => {
        it('deploys successfully', async() => {
            const address = instance.address;
            assert.notEqual(address, 0x0);
            assert.notEqual(address, '');
            assert.notEqual(address, null);
            assert.notEqual(address, undefined);
        })

        it('has a token address', async() => {
            const tokenAddress = await instance.tokenAddress();
            tokenAddress.should.equal(token.address);
        })
    })

    describe('Tier updation', async() => {
        it('should not allow others to add users to tiers', async() => {
            await truffleAssert.reverts(instance.addWhitelistOne(accounts[2], {from: accounts[1]}), "Ownable: caller is not the owner");
        })

        it('should allow owner to add users to tiers', async() => {
            await instance.addWhitelistSeven(accounts[2]);
            const added = await instance.getWhitelistSeven(accounts[2]);
            added.should.equal(true, "Tier updated successfully");
            const otherTier = await instance.getWhitelistNine(accounts[2]);
            otherTier.should.equal(false, "Other tiers are not updated");
        })
    })

    describe('Payment', async() => {
        it('should not allow users to pay before start time', async() => {
            await instance.addWhitelistOne(accounts[0]);
            const approval = 1000000000000000000;
            await token.approve(instance.address, approval.toString());
            await truffleAssert.reverts(instance.buyTokens(approval.toString()), "The sale is not started yet ");
        })

        it('should not allow users to pay more than maxCap after sale starts', async() => {
            function timeout(ms) {
                return new Promise(resolve => setTimeout(resolve, ms));
            }
            await timeout(30000);
            const approval = 200000000000000000000;
            await token.approve(instance.address, approval.toString());
            await truffleAssert.reverts(instance.buyTokens(approval.toString()), "buyTokens: purchase would exceed max cap");
        })

        it('should not allow non-whitelisted address to invest', async() => {
            const approval = 1000000000000000000;
            await token.transfer(accounts[3], approval.toString());
            await token.approve(instance.address, approval.toString(), {from: accounts[3]});
            await truffleAssert.reverts(instance.buyTokens(approval.toString(), {from: accounts[3]}), "Not whitelisted");
        })


        it('should not allow users to pay more than tier limit', async() => {
            const approval = 15000000000000000000;
            await truffleAssert.reverts(instance.buyTokens(approval.toString()), "buyTokens: purchase would exceed Tier one max cap");
        })

        it('should not allow users to more than per user limit', async() => {
            const approval = 6000000000000000000;
            await truffleAssert.reverts(instance.buyTokens(approval.toString()), "buyTokens:You are investing more than your tier-1 limit!");
        })

        it('should allow users to pay within the limits', async() => {
            const approval = 2000000000000000000;
            await instance.buyTokens(approval.toString());
            const userBal = await instance.buyInOneTier(accounts[0]);
            userBal.toString().should.equal(approval.toString(), "Payment successfull");
            const ownerBal = await token.balanceOf(accounts[1]);
            ownerBal.toString().should.equal(approval.toString(), "Owner balance updated");
        })

        it('should allow users to reinvest under their limit', async() => {
            const approval = 2000000000000000000;
            await instance.buyTokens(approval.toString());
            const userBal = await instance.buyInOneTier(accounts[0]);
            userBal.toString().should.equal("4000000000000000000", "Balance updated successfully");
            const ownerBal = await token.balanceOf(accounts[1]);
            ownerBal.toString().should.equal("4000000000000000000", "Owner balance updated");

        })

        it('should not allow users to invest after sale ends', async() => {
            function timeout(ms) {
                return new Promise(resolve => setTimeout(resolve, ms));
            }
            await timeout(30000);
            const approval = 1000000000000000000;
            await truffleAssert.reverts(instance.buyTokens(approval.toString()), "The sale is closed");
        })
    })
})
