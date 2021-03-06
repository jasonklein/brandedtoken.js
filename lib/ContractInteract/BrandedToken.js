'use strict';

const Web3 = require('web3');
const Contracts = require('../Contracts');
const AbiBinProvider = require('../AbiBinProvider');
const Utils = require('../../utils/Utils');

const ContractName = 'BrandedToken';

/**
 * Contract interact for Branded token.
 */
class BrandedToken {
  /**
   * Constructor for Branded token.
   *
   * @param {Object} web3 Web3 object.
   * @param {string} address BrandedToken contract address.
   */
  constructor(web3, address) {
    if (!(web3 instanceof Web3)) {
      throw new TypeError("Mandatory Parameter 'web3' is missing or invalid");
    }
    if (!Web3.utils.isAddress(address)) {
      throw new TypeError(
        `Mandatory Parameter 'address' is missing or invalid: ${address}`,
      );
    }

    this.web3 = web3;
    this.address = address;

    this.contract = Contracts.getBrandedToken(this.web3, this.address);

    if (!this.contract) {
      throw new TypeError(
        `Could not load branded token contract for: ${this.address}`,
      );
    }

    this.convertToBrandedTokens = this.convertToBrandedTokens.bind(this);
    this.requestStake = this.requestStake.bind(this);
    this.requestStakeRawTx = this.requestStakeRawTx.bind(this);
    this.acceptStakeRequest = this.acceptStakeRequest.bind(this);
    this.acceptStakeRequestRawTx = this.acceptStakeRequestRawTx.bind(this);
    this.liftRestriction = this.liftRestriction.bind(this);
    this.liftRestrictionRawTx = this.liftRestrictionRawTx.bind(this);
    this.isUnrestricted = this.isUnrestricted.bind(this);
    this.rejectStakeRequest = this.rejectStakeRequest.bind(this);
    this.rejectStakeRequestRawTx = this.rejectStakeRequestRawTx.bind(this);
  }

  /**
   * Deploys a Branded token contract.
   *
   * @dev Conversion parameters provide the conversion rate and its scale.
   *      For example, if 1 value token is equivalent to 3.5 branded
   *      tokens (1:3.5), _conversionRate == 35 and
   *      _conversionRateDecimals == 1.
   *
   *      Constructor requires:
   *          - valueToken address is not zero
   *          - conversionRate is not zero
   *          - conversionRateDecimals is not greater than 5
   *
   * @param {Web3} web3 Origin chain web3 object.
   * @param {string} valueToken The address of valueToken.
   * @param {string} symbol The value to which tokenSymbol, defined in
   *                        EIP20Token, is set.
   * @param {string} name The value to which tokenName, defined in EIP20Token,
   *                      is set.
   * @param {string} decimals The value to which tokenDecimals, defined in
   *                          EIP20Token, is set.
   * @param {number} conversionRate The value to which conversionRate is set.
   * @param {number} conversionRateDecimals The value to which
   *                                        conversionRateDecimals is set.
   * @param {string} organization Organization contract address.
   * @param {Object} txOptions Transaction options.
   *
   * @returns {Promise<BrandedToken>} Promise containing the Branded token
   *                                  instance that has been deployed.
   */
  static async deploy(
    web3,
    valueToken,
    symbol,
    name,
    decimals,
    conversionRate,
    conversionRateDecimals,
    organization,
    txOptions,
  ) {
    if (!txOptions) {
      const err = new TypeError('Invalid transaction options.');
      return Promise.reject(err);
    }
    if (!Web3.utils.isAddress(txOptions.from)) {
      const err = new TypeError(`Invalid from address: ${txOptions.from}.`);
      return Promise.reject(err);
    }

    const tx = BrandedToken.deployRawTx(
      web3,
      valueToken,
      symbol,
      name,
      decimals,
      conversionRate,
      conversionRateDecimals,
      organization,
    );

    return Utils.sendTransaction(tx, txOptions).then((txReceipt) => {
      const address = txReceipt.contractAddress;
      return new BrandedToken(web3, address);
    });
  }

  /**
   * Raw transaction for {@link BrandedToken#deploy}.
   *
   * @dev Conversion parameters provide the conversion rate and its scale.
   *      For example, if 1 value token is equivalent to 3.5 branded
   *      tokens (1:3.5), _conversionRate == 35 and
   *      _conversionRateDecimals == 1.
   *
   *      Constructor requires:
   *          - valueToken address is not zero
   *          - conversionRate is not zero
   *          - conversionRateDecimals is not greater than 5
   *
   * @param {Web3} web3 Origin chain web3 object.
   * @param {string} valueToken The address of valueToken.
   * @param {string} symbol The value to which tokenSymbol, defined in
   *                        EIP20Token, is set.
   * @param {string} name The value to which tokenName, defined in EIP20Token,
   *                      is set.
   * @param {string} decimals The value to which tokenDecimals, defined in
   *                          EIP20Token, is set.
   * @param {number} conversionRate The value to which conversionRate is set.
   * @param {number} conversionRateDecimals The value to which
   *                                        conversionRateDecimals is set.
   * @param {string} organization Organization contract address.
   *
   * @returns {Object} Raw transaction.
   */
  static deployRawTx(
    web3,
    valueToken,
    symbol,
    name,
    decimals,
    conversionRate,
    conversionRateDecimals,
    organization,
  ) {
    if (!(web3 instanceof Web3)) {
      throw new TypeError(
        `Mandatory Parameter 'web3' is missing or invalid: ${web3}`,
      );
    }
    if (!Web3.utils.isAddress(valueToken)) {
      throw new TypeError(`Invalid valueToken address: ${valueToken}.`);
    }
    if (!Web3.utils.isAddress(organization)) {
      throw new TypeError(`Invalid organization address: ${organization}.`);
    }
    if (!(conversionRate > 0)) {
      throw new TypeError(`Invalid conversion rate: ${conversionRate}. It should be greater than zero`);
    }
    if (!(conversionRateDecimals < 5)) {
      throw new TypeError(`Invalid conversion rate decimal: ${conversionRateDecimals}. It should be less than 5`);
    }

    const abiBinProvider = new AbiBinProvider();
    const bin = abiBinProvider.getBIN(ContractName);

    const args = [
      valueToken,
      symbol,
      name,
      decimals,
      conversionRate,
      conversionRateDecimals,
      organization,
    ];

    const contract = Contracts.getBrandedToken(web3);

    return contract.deploy(
      {
        data: bin,
        arguments: args,
      },
    );
  }

  /**
   * This calculates branded tokens equivalent to given value tokens.
   *
   * @param {string} valueTokens Amount of value token.
   *
   * @return {Promise<string>} Promise that resolves to amount of branded token.
   */
  convertToBrandedTokens(valueTokens) {
    return this.contract.methods
      .convertToBrandedTokens(valueTokens)
      .call();
  }

  /**
   * Request stake for given amount. Approval for stake amount to branded
   * token is required before calling this method.
   *
   * @param {string} stakeAmount Stake amount.
   * @param {Object} txOptions Transaction options.
   *
   * @return {Promise<Object>} Promise that resolves to transaction receipt.
   */
  async requestStake(stakeAmount, txOptions) {
    if (!txOptions) {
      const err = new TypeError(`Invalid transaction options: ${txOptions}.`);
      return Promise.reject(err);
    }
    if (!Web3.utils.isAddress(txOptions.from)) {
      const err = new TypeError(
        `Invalid from address ${txOptions.from} in transaction options.`,
      );
      return Promise.reject(err);
    }

    const mintedAmount = await this.convertToBrandedTokens(stakeAmount);
    const tx = await this.requestStakeRawTx(stakeAmount, mintedAmount);
    return Utils.sendTransaction(tx, txOptions);
  }

  /**
   * Raw tx for request stake.
   *
   * @param {string} stakeAmount Stake amount.
   * @param {string} mintAmount Amount that will be minted after staking.
   *
   * @return Promise<Object> Raw transaction object.
   */
  requestStakeRawTx(stakeAmount, mintAmount) {
    return Promise.resolve(this.contract.methods.requestStake(stakeAmount, mintAmount));
  }

  /**
   * Accept open stake request identified by request hash.
   *
   * @param {string} stakeRequestHash Hash of stake request information
   *                                  calculated per EIP 712.
   * @param {string} r R of signature received from worker.
   * @param {string} s s of signature received from worker.
   * @param {string} v v of signature received from worker.
   * @param {Object} txOptions Transaction options
   *
   * @return {Promise<Object>} Promise that resolves to transaction receipt.
   */
  async acceptStakeRequest(stakeRequestHash, r, s, v, txOptions) {
    if (!txOptions) {
      const err = new TypeError(`Invalid transaction options: ${txOptions}.`);
      return Promise.reject(err);
    }
    if (!Web3.utils.isAddress(txOptions.from)) {
      const err = new TypeError(
        `Invalid from address ${txOptions.from} in transaction options.`,
      );
      return Promise.reject(err);
    }

    const tx = await this.acceptStakeRequestRawTx(stakeRequestHash, r, s, v);
    return Utils.sendTransaction(tx, txOptions);
  }

  /**
   * Raw transaction for accept stake request.
   *
   * @param {string} stakeRequestHash Hash of stake request information
   *                                  calculated per EIP 712.
   * @param {string} r R of signature received from worker.
   * @param {string} s s of signature received from worker.
   * @param {string} v v of signature received from worker.
   *
   * @return {Promise<Object>} Raw transaction object.
   */
  acceptStakeRequestRawTx(stakeRequestHash, r, s, v) {
    if (!stakeRequestHash) {
      const err = new TypeError(`Invalid stakeRequestHash: ${stakeRequestHash}.`);
      return Promise.reject(err);
    }
    if (!r) {
      const err = new TypeError(`Invalid r of signature: ${r}.`);
      return Promise.reject(err);
    }
    if (!s) {
      const err = new TypeError(`Invalid s of signature: ${s}.`);
      return Promise.reject(err);
    }
    if (!v) {
      const err = new TypeError(`Invalid v of signature: ${v}.`);
      return Promise.reject(err);
    }

    return Promise.resolve(
      this.contract.methods.acceptStakeRequest(
        stakeRequestHash,
        r,
        s,
        v,
      ),
    );
  }

  /**
   * Lift restriction for given list of addresses.
   *
   * @param {string} addresses Addresses for which to lift restrictions.
   * @param {Object} txOptions Transaction options.
   *
   * @return {Promise<Object>} Promise that resolves to transaction receipt.
   */
  async liftRestriction(addresses, txOptions) {
    if (!txOptions) {
      const err = new TypeError(`Invalid transaction options: ${txOptions}.`);
      return Promise.reject(err);
    }
    if (!Web3.utils.isAddress(txOptions.from)) {
      const err = new TypeError(
        `Invalid from address ${txOptions.from} in transaction options.`,
      );
      return Promise.reject(err);
    }

    const tx = await this.liftRestrictionRawTx(addresses);
    return Utils.sendTransaction(tx, txOptions);
  }

  /**
   * Raw tx for lift restriction.
   *
   * @param {Array} addresses Addresses for which to lift restrictions.
   *
   * @return {Promise<Object>} Raw transaction object.
   */
  liftRestrictionRawTx(addresses) {
    if (!addresses || addresses.length === 0) {
      const err = new TypeError(
        `At least one addresses must be defined : ${addresses}`,
      );
      return Promise.reject(err);
    }
    return Promise.resolve(this.contract.methods.liftRestriction(addresses));
  }

  /**
   * Checks if given address is unrestricted.
   *
   * @param {string} address Address that should be checked.
   *
   * @returns {Promise<boolean>} Promise that resolves to `true` if
   *                             unrestricted.
   */
  isUnrestricted(address) {
    return this.contract.methods
      .isUnrestricted(address)
      .call();
  }

  /**
   * This rejects a stake request, must be called by organization worker.
   *
   * @param {string} stakeRequestHash Hash of stake request information
   *                                  calculated per EIP 712.
   *
   * @return {Promise<Object>} Promise that resolves to transaction receipt.
   */
  async rejectStakeRequest(stakeRequestHash, txOptions) {
    if (!txOptions) {
      const err = new TypeError(`Invalid transaction options: ${txOptions}.`);
      return Promise.reject(err);
    }
    if (!Web3.utils.isAddress(txOptions.from)) {
      const err = new TypeError(
        `Invalid from address ${txOptions.from} in transaction options.`,
      );
      return Promise.reject(err);
    }

    const tx = await this.rejectStakeRequestRawTx(stakeRequestHash);
    return Utils.sendTransaction(tx, txOptions);
  }

  /**
   * This returns raw tx for reject stake request.
   *
   * @param {string} stakeRequestHash Hash of stake request information
   *                                  calculated per EIP 712.
   *
   * @return Promise<Object> Raw transaction object.
   */
  rejectStakeRequestRawTx(stakeRequestHash) {
    if (!stakeRequestHash) {
      const err = new TypeError(`Invalid stakeRequestHash: ${stakeRequestHash}.`);
      return Promise.reject(err);
    }

    return Promise.resolve(
      this.contract.methods.rejectStakeRequest(stakeRequestHash),
    );
  }
}

module.exports = BrandedToken;
