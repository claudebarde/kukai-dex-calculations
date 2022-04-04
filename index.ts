"use strict";
import BigNumber from "bignumber.js";

type numericInput = BigNumber | number | string;

export default class DexCalculations {
  isLbContract: boolean;

  constructor(isLbContract?: boolean) {
    if (isLbContract) {
      this.isLbContract = isLbContract;
    } else {
      this.isLbContract = false;
    }
  }

  /**
   * Test if a bigInt is greater than zero.
   *
   * @param {BigNumber} x
   * @returns {boolean} x > 0
   */
  gtZero(x: BigNumber): boolean {
    return x.isGreaterThan(new BigNumber(0));
  }

  /**
   * Test if a bigInt is greater than or equal to zero.
   *
   * @param {BigNumber} x
   * @returns {boolean} x >= 0
   */
  geqZero(x: BigNumber): boolean {
    return x.isGreaterThanOrEqualTo(new BigNumber(0));
  }

  /**
   * Test if a bigInt is equal to zero.
   *
   * @param {BigNumber} x
   * @returns {boolean} x == 0
   */
  eqZero(x: BigNumber): boolean {
    return x.isZero();
  }

  /**
   * Test if a bigInt is less than or equal to zero.
   *
   * @param {BigNumber} x
   * @returns {boolean} x <= 0
   */
  leqZero(x: BigNumber): boolean {
    return x.isLessThanOrEqualTo(new BigNumber(0));
  }

  /**
   * Ceiling division. If the remainder is greater than zero, increment by one.
   *
   * @param {BigNumber} x
   * @param {BigNumber} y
   * @returns {BigNumber} if rem(x,y) > 0 then (x/y+1) else (x/y)
   */
  ceilingDiv(x: BigNumber, y: BigNumber): BigNumber {
    const result = x.mod(y);
    if (result.isGreaterThanOrEqualTo(new BigNumber(0))) {
      return x.dividedBy(y).plus(new BigNumber(1));
    }
    return x.dividedBy(y);
  }

  /**
   * Updates xtzPool with the 2.5 tez subsidy. Since this is applied before all other operations it can be assumed to have been applied at least once for any call to the CPMM.
   *
   * @param {BigNumber} xtzPool
   * @returns {BigNumber} xtzPool + 2_500_000
   */
  creditSubsidy(xtzPool: BigNumber): BigNumber {
    return xtzPool.plus(new BigNumber(2_500_000));
  }

  /**
   * =============================================================================
   * xtzToToken entrypoint functions
   * =============================================================================
   */

  /**
   * Calculate the amount of token sold for a given XTZ input and Dexter's two pool
   * values for the dexter xtzToToken entrypoint.
   *
   * @param {(BigNumber|number|string)} xtzIn - XTZ amount the sender sells to Dexter. Must be greater than zero.
   * @param {(BigNumber|number|string)} xtzPool - XTZ amount that Dexter holds. Must be greater than zero.
   * @param {(BigNumber|number|string)} tokenPool - Token amount that Dexter holds. Must be greater than zero.
   * @param {number} feePercent - A number between 0.0 and 100, denoting the percentage fee that the dex will deduct from the amount sent.
   * @param {number} burnPercent - A number between 0.0 and 100, denoting the percentage of the tokens that will be burned by the dex during the trade.
   * @param {boolean} includeSubsidy - In the case of liquidity baking, a subsudy will be added per block, affecting the calcualtion. This boolean is used to control whether or not this is taken into account.
   * @returns {(BigNumber|null)} The amount of token that Dexter will send to the :to address in the dexter xtzToToken entrypoint.
   */

  xtzToTokenTokenOutput(
    xtzIn: numericInput,
    xtzPool: numericInput,
    tokenPool: numericInput,
    feePercent?: number,
    burnPercent?: number
  ): BigNumber | null {
    // TODO: check the line below
    //const xtzPool = xtzPool;
    if (this.isLbContract) {
      xtzPool = this.creditSubsidy(new BigNumber(xtzPool));
    }

    let xtzIn_ = new BigNumber(0);
    let xtzPool_ = new BigNumber(0);
    let tokenPool_ = new BigNumber(0);
    const fee = feePercent ? 1000 - Math.floor(feePercent * 10) : 1000;
    const burn = burnPercent ? 1000 - Math.floor(burnPercent * 10) : 1000;
    const feeMultiplier = fee * burn;

    try {
      xtzIn_ = new BigNumber(xtzIn);
      xtzPool_ = new BigNumber(xtzPool);
      tokenPool_ = new BigNumber(tokenPool);
    } catch (err) {
      return null;
    }
    if (
      this.gtZero(xtzIn_) &&
      this.gtZero(xtzPool_) &&
      this.gtZero(tokenPool_)
    ) {
      // Includes constiable fee (0.1% for LB, 0.3 for Quipu) and constiable burn (0.1% for LB, 0% for Quipu) calculated separatedly: e.g. 0.1% for both:  999/1000 * 999/1000 = 998100/1000000
      // (xtzIn_ * tokenPool_ * 999 * 999) / (tokenPool * 1000 - tokenOut * 999 * 999)
      const numerator = xtzIn_
        .times(tokenPool_)
        .times(new BigNumber(feeMultiplier));
      const denominator = xtzPool_
        .times(new BigNumber(1_000_000))
        .plus(xtzIn_.times(new BigNumber(feeMultiplier)));
      return numerator.dividedBy(denominator);
    } else {
      return null;
    }
  }

  /**
   * Calculate the amount of XTZ you must pay in in order to receive a target
   * amount of token for a given in the two Dexter pools. tokenOut is considered the
   * maximum amount a user may receive. The user may receive less because of slippage.
   *
   * @param {(BigNumber|number|string)} tokenOut - The amount of token that a user wants to receive. Must be greater than zero.
   * @param {(BigNumber|number|string)} xtzPool - XTZ amount that Dexter holds. Must be greater than zero.
   * @param {(BigNumber|number|string)} tokenPool - Token amount that Dexter holds. Must be greater than zero.
   * @param {(BigNumber|number|string)} decimals - The number of decimals a token has. Must be greater than or equal to zero.
   * @param {number} feePercent - A number between 0.0 and 100, denoting the percentage fee that the dex will deduct from the amount sent.
   * @param {number} burnPercent - A number between 0.0 and 100, denoting the percentage of the tokens that will be burned by the dex during the trade.
   * @param {boolean} includeSubsidy - In the case of liquidity baking, a subsudy will be added per block, affecting the calcualtion. This boolean is used to control whether or not this is taken into account.
   * @returns {(BigNumber|null)} The amount of XTZ the user must send to xtzToToken to get the tokenOut amount.
   */
  xtzToTokenXtzInput(
    tokenOut: numericInput,
    xtzPool: numericInput,
    tokenPool: numericInput,
    decimals: numericInput,
    feePercent: number,
    burnPercent: number
  ): BigNumber | null {
    //const xtzPool = xtzPool;
    if (this.isLbContract) {
      xtzPool = this.creditSubsidy(new BigNumber(xtzPool));
    }

    let tokenOut_ = new BigNumber(0);
    let xtzPool_ = new BigNumber(0);
    let tokenPool_ = new BigNumber(0);
    let decimals_ = new BigNumber(0);
    const fee = 1000 - Math.floor(feePercent * 10);
    const burn = 1000 - Math.floor(burnPercent * 10);
    const feeMultiplier = fee * burn;

    try {
      tokenOut_ = new BigNumber(tokenOut);
      xtzPool_ = new BigNumber(xtzPool);
      tokenPool_ = new BigNumber(tokenPool);
      decimals_ = new BigNumber(decimals);
    } catch (err) {
      return null;
    }

    if (
      this.gtZero(tokenOut_) &&
      this.gtZero(xtzPool_) &&
      this.gtZero(tokenPool_) &&
      this.geqZero(decimals_)
    ) {
      // Includes constiable fee (0.1% for LB, 0.3 for Quipu) and constiable burn (0.1% for LB, 0% for Quipu) calculated separatedly: e.g. 0.1% for both:  999/1000 * 999/1000 = 998100/1000000
      // (xtzPool_ * tokenOut_ * 1000 * 1000 * 10 ** decimals) / (tokenPool - tokenOut * 999 * 999 * 10 ** decimals))
      const result = xtzPool_
        .times(tokenOut_)
        .times(new BigNumber(1_000_000))
        .times(Math.pow(10, decimals_.toNumber()))
        .dividedBy(
          tokenPool_
            .minus(tokenOut_)
            .times(
              new BigNumber(feeMultiplier).times(
                Math.pow(10, decimals_.toNumber())
              )
            )
        );

      if (this.gtZero(result)) {
        return result;
      }
      return null;
    } else {
      return null;
    }
  }

  /**
   * Calculate the exchange rate for an XTZ to Token trade including the supplied fee given
   * to the liquidity providers and the penalty for trade size.
   *
   * @param {(BigNumber|number|string)} xtzIn - XTZ amount the sender sells to Dexter. Must be greater than zero.
   * @param {(BigNumber|number|string)} xtzPool - XTZ amount that Dexter holds. Must be greater than zero.
   * @param {(BigNumber|number|string)} tokenPool - Token amount that Dexter holds. Must be greater than zero.
   * @param {number} feePercent - A number between 0.0 and 100, denoting the percentage fee that the dex will deduct from the amount sent.
   * @param {number} burnPercent - A number between 0.0 and 100, denoting the percentage of the tokens that will be burned by the dex during the trade.
   * @param {boolean} includeSubsidy - In the case of liquidity baking, a subsudy will be added per block, affecting the calcualtion. This boolean is used to control whether or not this is taken into account.
   * @returns {(BigNumber|null)} The exchange rate as a float number.
   */
  xtzToTokenExchangeRate(
    xtzIn: numericInput,
    xtzPool: numericInput,
    tokenPool: numericInput,
    feePercent: number,
    burnPercent: number
  ): BigNumber | null {
    let xtzIn_ = new BigNumber(0);
    let xtzPool_ = new BigNumber(0);
    let tokenPool_ = new BigNumber(0);
    try {
      xtzIn_ = new BigNumber(xtzIn);
      xtzPool_ = new BigNumber(xtzPool);
      tokenPool_ = new BigNumber(tokenPool);
    } catch (err) {
      return null;
    }
    if (
      this.gtZero(xtzIn_) &&
      this.gtZero(xtzPool_) &&
      this.gtZero(tokenPool_)
    ) {
      const tokenOutput = this.xtzToTokenTokenOutput(
        xtzIn_,
        xtzPool_,
        tokenPool_,
        feePercent,
        burnPercent
      );
      if (tokenOutput === null) return null;

      return tokenOutput.dividedBy(xtzIn_);
    } else {
      return null;
    }
  }

  /**
   * Same as xtzToTokenExchangeRate but adjusted for the decimal places.
   *
   * @param {(BigNumber|number|string)} xtzIn - XTZ amount the sender sells to Dexter. Must be greater than zero.
   * @param {(BigNumber|number|string)} xtzPool - XTZ amount that Dexter holds. Must be greater than zero.
   * @param {(BigNumber|number|string)} tokenPool - Token amount that Dexter holds. Must be greater than zero.
   * @param {(BigNumber|number|string)} decimals - The number of decimals a token has. Must be greater than or equal to zero.
   * @param {number} feePercent - A number between 0.0 and 100, denoting the percentage fee that the dex will deduct from the amount sent.
   * @param {number} burnPercent - A number between 0.0 and 100, denoting the percentage of the tokens that will be burned by the dex during the trade.
   * @param {boolean} includeSubsidy - In the case of liquidity baking, a subsudy will be added per block, affecting the calcualtion. This boolean is used to control whether or not this is taken into account.
   * @returns {(BigNumber|null)} The exchange rate as a float number.
   */
  xtzToTokenExchangeRateForDisplay(
    xtzIn: numericInput,
    xtzPool: numericInput,
    tokenPool: numericInput,
    decimals: numericInput,
    feePercent: number,
    burnPercent: number
  ): BigNumber | null {
    let xtzIn_ = new BigNumber(0);
    let xtzPool_ = new BigNumber(0);
    let tokenPool_ = new BigNumber(0);
    try {
      xtzIn_ = new BigNumber(xtzIn);
      xtzPool_ = new BigNumber(xtzPool);
      tokenPool_ = new BigNumber(tokenPool);
    } catch (err) {
      return null;
    }
    if (
      this.gtZero(xtzIn_) &&
      this.gtZero(xtzPool_) &&
      this.gtZero(tokenPool_)
    ) {
      const tokenOutput = this.xtzToTokenTokenOutput(
        xtzIn_,
        xtzPool_,
        tokenPool_,
        feePercent,
        burnPercent
      );
      if (tokenOutput === null) return null;

      return tokenOutput
        .times(Math.pow(10, -decimals))
        .dividedBy(xtzIn_.times(Math.pow(10, -6)));
    } else {
      return null;
    }
  }

  /**
   * Calculate the xtzToToken market rate for a give Dexter contract. The market
   * rate is an ideal number that doesn't include fees or penalties. In practice,
   * this rate  cannot be executed. This is used for displaying an exchange rate
   * without the trade size penalty (before a user enters an amount for display).
   *
   * @param {(BigNumber|number|string)} xtzPool - XTZ amount that Dexter holds. Must be greater than zero.
   * @param {(BigNumber|number|string)} tokenPool - Token amount that Dexter holds. Must be greater than zero.
   * @param {(BigNumber|number|string)} decimals - The number of decimals a token has. Must be greater than or equal to zero.
   * @returns {(BigNumber|null)} The market rate as a float value.
   */
  xtzToTokenMarketRate(
    xtzPool: numericInput,
    tokenPool: numericInput,
    decimals: numericInput
  ): BigNumber | null {
    let xtzPool_ = new BigNumber(0);
    let tokenPool_ = new BigNumber(0);
    let decimals_ = new BigNumber(0);
    try {
      xtzPool_ = new BigNumber(xtzPool);
      tokenPool_ = new BigNumber(tokenPool);
      decimals_ = new BigNumber(decimals);
    } catch (err) {
      return null;
    }
    if (
      this.gtZero(xtzPool_) &&
      this.gtZero(tokenPool_) &&
      this.geqZero(decimals_)
    ) {
      let xtzPool__ = xtzPool_.times(Math.pow(10, -6));
      let tokenPool__ = tokenPool_.times(Math.pow(10, -decimals_.toNumber()));
      return tokenPool__.dividedBy(xtzPool__);
    } else {
      return null;
    }
  }

  /**
   * Calculate the xtzToToken price impact for a given Dexter contract. Price
   * impact is a measure of how much a trade will alter the future price.
   *
   * @param {(BigNumber|number|string)} xtzIn - The amount of XTZ the sender will sell to Dexter in xtzToToken.
   * @param {(BigNumber|number|string)} xtzPool - XTZ amount that Dexter holds. Must be greater than zero.
   * @param {(BigNumber|number|string)} tokenPool - Token amount that Dexter holds. Must be greater than zero.
   * @param {number} burnPercent - A number between 0.0 and 100, denoting the percentage of the tokens that will be burned by the dex during the trade.
   * @param {boolean} includeSubsidy - In the case of liquidity baking, a subsudy will be added per block, affecting the calcualtion. This boolean is used to control whether or not this is taken into account.
   * @returns {(BigNumber|null)} - The price impact percentage as a float value.
   */
  xtzToTokenPriceImpact(
    xtzIn: numericInput,
    xtzPool: numericInput,
    tokenPool: numericInput,
    burnPercent: number
  ): BigNumber | null {
    let xtzIn_ = new BigNumber(0);
    let xtzPool_ = new BigNumber(0);
    let tokenPool_ = new BigNumber(0);
    const burn = 1000 - Math.floor(burnPercent * 10);

    try {
      xtzIn_ = new BigNumber(xtzIn);
      xtzPool_ = new BigNumber(xtzPool);
      tokenPool_ = new BigNumber(tokenPool);
    } catch (err) {
      return null;
    }
    if (this.isLbContract) {
      xtzPool_ = this.creditSubsidy(xtzPool_);
    }

    if (
      this.gtZero(xtzIn_) &&
      this.gtZero(xtzPool_) &&
      this.gtZero(tokenPool_)
    ) {
      const midPrice = tokenPool_.times(xtzPool_);
      const xtzInNetBurn = xtzIn_.times(burn).dividedBy(1000);
      const tokensBought = xtzInNetBurn
        .times(tokenPool_)
        .dividedBy(xtzInNetBurn.plus(xtzPool_));
      // if no tokens have been purchased then there is no price impact
      if (this.leqZero(tokensBought)) {
        return new BigNumber(0);
      }
      const exactQuote = midPrice.times(xtzIn_);
      return exactQuote.minus(tokensBought).dividedBy(exactQuote);
    } else {
      return null;
    }
  }

  /**
   * Calculate the minimum token out to be sent to Dexter for a given max tokenOut
   * and the max allowed slippage rate the user accepts. If the exchange rate
   * has lowered less than the user's allowed slippage at the time of execution,
   * then the trade will fail.
   *
   * @param {(BigNumber|number|string)} tokenOut - Token out as calculated by xtzToTokenTokenOut. Must be greater than zero.
   * @param {number} allowedSlippage - Maximum slippage rate that a user will except for an exchange. Must be between 0.00 and 1.00.
   * @returns {(BigNumber|null)} The minimum token amount to send to the xtzToToken entrypoint.
   */
  xtzToTokenMinimumTokenOutput(
    tokenOut: numericInput,
    allowedSlippage: number
  ): BigNumber | null {
    if (tokenOut > 0 && allowedSlippage >= 0.0 && allowedSlippage <= 1.0) {
      // ((tokenOut * 1000) - ((tokenOut * 1000) * (allowedSlippage * 100000) / 100000)) / 1000
      const tokenOut_ = new BigNumber(tokenOut).times(new BigNumber(1000));
      const allowedSlippage_ = new BigNumber(
        Math.floor(allowedSlippage * 1000 * 100)
      );
      const result = tokenOut_
        .minus(
          tokenOut_.times(allowedSlippage_).dividedBy(new BigNumber(100000))
        )
        .dividedBy(1000);
      return BigNumber.maximum(result, new BigNumber(1));
    } else {
      return null;
    }
  }

  /**
   * Calculate the fee that liquidity providers, as a whole and not individually,
   * will receive for a given amount of XTZ sold to a dexter contract.
   *
   * @param {(BigNumber|number|string)} xtzIn The amount of XTZ sold to dexter. Must be greater than zero.
   * @returns {(BigNumber|null)} The fee paid to the dexter liquidity providers.
   */
  totalLiquidityProviderFee(xtzIn: BigNumber): BigNumber | null {
    let xtzIn_ = new BigNumber(0);
    try {
      xtzIn_ = new BigNumber(xtzIn);
    } catch (err) {
      return null;
    }
    if (this.gtZero(xtzIn_)) {
      return new BigNumber(xtzIn_).times(new BigNumber(1)).dividedBy(1000);
    } else {
      return null;
    }
  }

  /**
   * Calculate the fee that a single liquidity provider will receive for a given amount of
   * XTZ sold to a dexter contract.
   *
   * @param {(BigNumber|number|string)} xtzIn - The amount of XTZ sold to dexter. Must be greater than zero.
   * @returns {(BigNumber|null)} The fee paid to an individual dexter liquidity provider.
   */
  liquidityProviderFee(
    xtzIn: numericInput,
    totalLiquidity: numericInput,
    userLiquidity: numericInput
  ): BigNumber | null {
    let xtzIn_ = new BigNumber(0);
    let totalLiquidity_ = new BigNumber(0);
    let userLiquidity_ = new BigNumber(0);
    try {
      xtzIn_ = new BigNumber(xtzIn);
      totalLiquidity_ = new BigNumber(totalLiquidity);
      userLiquidity_ = new BigNumber(userLiquidity);
    } catch (err) {
      return null;
    }
    if (
      this.gtZero(xtzIn_) &&
      this.gtZero(totalLiquidity_) &&
      this.gtZero(userLiquidity_)
    ) {
      const fee = this.totalLiquidityProviderFee(xtzIn_);
      if (fee === null) return null;

      return fee.dividedBy(totalLiquidity_.dividedBy(userLiquidity_));
    } else {
      return null;
    }
  }

  /**
   * =============================================================================
   * tokenToXtz entrypoint functions
   * =============================================================================
   */

  /**
   * Get the amount of XTZ sold for a given token input and the pool state of Dexter
   * for the Dexter tokenToXtz entrypoint.
   *
   * @param {(BigNumber|number|string)} tokenIn - Token amount the sender sells to Dexter. Must be greater than zero.
   * @param {(BigNumber|number|string)} xtzPool - XTZ amount that Dexter holds. Must be greater than zero.
   * @param {(BigNumber|number|string)} tokenPool - Token amount that Dexter holds. Must be greater than zero.
   * @param {number} feePercent - A number between 0.0 and 100, denoting the percentage fee that the dex will deduct from the amount sent.
   * @param {number} burnPercent - A number between 0.0 and 100, denoting the percentage of the tokens that will be burned by the dex during the trade.
   * @param {boolean} includeSubsidy - In the case of liquidity baking, a subsudy will be added per block, affecting the calcualtion. This boolean is used to control whether or not this is taken into account.
   * @returns {(BigNumber|null)} The amount of XTZ that Dexter will send to the :to
   * address in the dexter tokenToXtz entrypoint.
   */
  tokenToXtzXtzOutput(
    tokenIn: numericInput,
    xtzPool: numericInput,
    tokenPool: numericInput,
    feePercent: number,
    burnPercent: number
  ): BigNumber | null {
    let tokenIn_ = new BigNumber(0);
    let xtzPool_ = new BigNumber(0);
    let tokenPool_ = new BigNumber(0);
    const fee = 1000 - Math.floor(feePercent * 10);
    const burn = 1000 - Math.floor(burnPercent * 10);
    const feeAndBurnMultiplier = fee * burn;
    const feeMultiplier = fee * 1000;

    try {
      tokenIn_ = new BigNumber(tokenIn);
      xtzPool_ = new BigNumber(xtzPool);
      tokenPool_ = new BigNumber(tokenPool);
    } catch (err) {
      return null;
    }
    if (this.isLbContract) {
      xtzPool_ = this.creditSubsidy(xtzPool_);
    }
    if (
      this.gtZero(tokenIn_) &&
      this.gtZero(xtzPool_) &&
      this.gtZero(tokenPool_)
    ) {
      // Includes constiable fee (0.1% for LB, 0.3 for Quipu) and constiable burn (0.1% for LB, 0% for Quipu) calculated separatedly: e.g. 0.1% for both:  999/1000 * 999/1000 = 998100/1000000
      const numerator = new BigNumber(tokenIn)
        .times(new BigNumber(xtzPool))
        .times(new BigNumber(feeAndBurnMultiplier));
      const denominator = new BigNumber(tokenPool)
        .times(new BigNumber(1000000))
        .plus(new BigNumber(tokenIn).times(new BigNumber(feeMultiplier)));
      return numerator.dividedBy(denominator);
    } else {
      return null;
    }
  }

  /**
   * Calculate the amount of token you must pay in in order to receive a target
   * amount of XTZ for a given Dexter pool state. xtzOut is considered the
   * maximum amount a user may receive. The user may receive less because of slippage.
   *
   * @param {(BigNumber|number|string)} xtzOut - The amount of token that a user wants to receive. Must be greater than zero.
   * @param {(BigNumber|number|string)} xtzPool - XTZ amount that Dexter holds. Must be greater than zero.
   * @param {(BigNumber|number|string)} tokenPool - Token amount that Dexter holds. Must be greater than zero.
   * @param {(BigNumber|number|string)} decimals - The number of decimals a token has. Must be greater than or equal to zero.
   * @param {number} feePercent - A number between 0.0 and 100, denoting the percentage fee that the dex will deduct from the amount sent.
   * @param {number} burnPercent - A number between 0.0 and 100, denoting the percentage of the tokens that will be burned by the dex during the trade.
   * @param {boolean} includeSubsidy - In the case of liquidity baking, a subsudy will be added per block, affecting the calcualtion. This boolean is used to control whether or not this is taken into account.
   * @returns {(BigNumber|null)} The amount of token the user must send to tokenToXtz to get the xtzOut amount.
   */
  tokenToXtzTokenInput(
    xtzOut: BigNumber,
    xtzPool: numericInput,
    tokenPool: numericInput,
    decimals: BigNumber,
    feePercent: number,
    burnPercent: number
  ): BigNumber | null {
    let xtzOut_ = new BigNumber(0);
    let xtzPool_ = new BigNumber(0);
    let tokenPool_ = new BigNumber(0);
    let decimals_ = new BigNumber(0);
    const fee = 1000 - Math.floor(feePercent * 10);
    const burn = 1000 - Math.floor(burnPercent * 10);
    const feeAndBurnMultiplier = fee * burn;
    const feeMultiplier = fee * 1000;

    try {
      xtzOut_ = new BigNumber(xtzOut);
      xtzPool_ = new BigNumber(xtzPool);
      tokenPool_ = new BigNumber(tokenPool);
      decimals_ = new BigNumber(decimals);
    } catch (err) {
      return null;
    }
    if (this.isLbContract) {
      xtzPool_ = this.creditSubsidy(xtzPool_);
    }
    if (
      this.gtZero(xtzOut_) &&
      this.gtZero(xtzPool_) &&
      this.gtZero(tokenPool_) &&
      this.geqZero(decimals_)
    ) {
      // Includes constiable fee (0.1% for LB, 0.3 for Quipu) and constiable burn (0.1% for LB, 0% for Quipu) calculated separatedly: e.g. 0.1% for both:  999/1000 * 999/1000 = 998100/1000000
      // (tokenPool_ * xtzOut_ * 1000 * 1000 * 10 ** decimals) / ((xtzPool * 999 * 1000 - xtzOut * 999 * 999) * 10 ** decimals))
      const result = tokenPool_
        .times(xtzOut_)
        .times(new BigNumber(1000000))
        .times(Math.pow(10, decimals_.toNumber()))
        .dividedBy(
          xtzPool_
            .times(new BigNumber(feeMultiplier))
            .minus(xtzOut_.times(new BigNumber(feeAndBurnMultiplier)))
            .times(Math.pow(10, decimals_.toNumber()))
        );

      if (this.gtZero(result)) {
        return result;
      }
      return null;
    } else {
      return null;
    }
  }

  /**
   * Calculate the exchange rate for a token to XTZ trade including the supplied fee given
   * to the liquidity providers and the penalty for large trades.
   *
   * @param {(BigNumber|number|string)} tokenIn - Token amount the sender sells to Dexter. Must be greater than zero.
   * @param {(BigNumber|number|string)} xtzPool - XTZ amount that Dexter holds. Must be greater than zero.
   * @param {(BigNumber|number|string)} tokenPool - Token amount that Dexter holds. Must be greater than zero.
   * @param {number} feePercent - A number between 0.0 and 100, denoting the percentage fee that the dex will deduct from the amount sent.
   * @param {number} burnPercent - A number between 0.0 and 100, denoting the percentage of the tokens that will be burned by the dex during the trade.
   * @param {boolean} includeSubsidy - In the case of liquidity baking, a subsudy will be added per block, affecting the calcualtion. This boolean is used to control whether or not this is taken into account.
   * @returns {(BigNumber|null)} The exchange rate as a float number.
   */
  tokenToXtzExchangeRate(
    tokenIn: numericInput,
    xtzPool: numericInput,
    tokenPool: numericInput,
    feePercent: number,
    burnPercent: number
  ): BigNumber | null {
    let tokenIn_ = new BigNumber(0);
    let xtzPool_ = new BigNumber(0);
    let tokenPool_ = new BigNumber(0);
    try {
      tokenIn_ = new BigNumber(tokenIn);
      xtzPool_ = new BigNumber(xtzPool);
      tokenPool_ = new BigNumber(tokenPool);
    } catch (err) {
      return null;
    }
    if (
      this.gtZero(tokenIn_) &&
      this.gtZero(xtzPool_) &&
      this.gtZero(tokenPool_)
    ) {
      const tokenOutput = this.tokenToXtzXtzOutput(
        tokenIn_,
        xtzPool_,
        tokenPool_,
        feePercent,
        burnPercent
      );
      if (tokenOutput === null) return null;

      return tokenOutput.dividedBy(tokenIn_);
    } else {
      return null;
    }
  }

  /**
   * Same as tokenToXtzExchangeRate but adjusted for the decimal places.
   *
   * @param {(BigNumber|number|string)} tokenIn - Token amount the sender sells to Dexter. Must be greater than zero.
   * @param {(BigNumber|number|string)} xtzPool - XTZ amount that Dexter holds. Must be greater than zero.
   * @param {(BigNumber|number|string)} tokenPool - Token amount that Dexter holds. Must be greater than zero.
   * @param {(BigNumber|number|string)} decimals - The number of decimals a token has. Must be greater than or equal to zero.
   * @param {number} feePercent - A number between 0.0 and 100, denoting the percentage fee that the dex will deduct from the amount sent.
   * @param {number} burnPercent - A number between 0.0 and 100, denoting the percentage of the tokens that will be burned by the dex during the trade.
   * @param {boolean} includeSubsidy - In the case of liquidity baking, a subsudy will be added per block, affecting the calcualtion. This boolean is used to control whether or not this is taken into account.
   * @returns {(BigNumber|null)} The exchange rate as a float number.
   */
  tokenToXtzExchangeRateForDisplay(
    tokenIn: numericInput,
    xtzPool: numericInput,
    tokenPool: numericInput,
    decimals: BigNumber,
    feePercent: number,
    burnPercent: number
  ): BigNumber | null {
    let tokenIn_ = new BigNumber(0);
    let xtzPool_ = new BigNumber(0);
    let tokenPool_ = new BigNumber(0);
    try {
      tokenIn_ = new BigNumber(tokenIn);
      xtzPool_ = new BigNumber(xtzPool);
      tokenPool_ = new BigNumber(tokenPool);
    } catch (err) {
      return null;
    }
    if (
      this.gtZero(tokenIn_) &&
      this.gtZero(xtzPool_) &&
      this.gtZero(tokenPool_)
    ) {
      const tokenOutput = this.tokenToXtzXtzOutput(
        tokenIn_,
        xtzPool_,
        tokenPool_,
        feePercent,
        burnPercent
      );
      if (tokenOutput === null) return null;

      return tokenOutput
        .times(Math.pow(10, -6))
        .dividedBy(tokenIn_.times(Math.pow(10, -decimals.toNumber())));
    } else {
      return null;
    }
  }

  /**
   * Calculate the tokenToXtz market rate for a given Dexter contract. The market
   * rate is an ideal number that doesn't include fees or penalties. In practice,
   * this rate cannot be executed. This is used for displaying an exchange rate
   * without the trade size penalty (before a user enters an amount for display).
   *
   * @param {(BigNumber|number|string)} xtzPool - XTZ amount that Dexter holds. Must be greater than zero.
   * @param {(BigNumber|number|string)} tokenPool - Token amount that Dexter holds. Must be greater than zero.
   * @param {(BigNumber|number|string)} decimals - The number of decimals a token has. Must be greater than or equal to zero.
   * @returns {(BigNumber|null)} The market rate as a float value.
   */
  tokenToXtzMarketRate(
    xtzPool: numericInput,
    tokenPool: numericInput,
    decimals: numericInput
  ): BigNumber | null {
    let xtzPool_ = new BigNumber(0);
    let tokenPool_ = new BigNumber(0);
    let decimals_ = new BigNumber(0);
    try {
      xtzPool_ = new BigNumber(xtzPool);
      tokenPool_ = new BigNumber(tokenPool);
      decimals_ = new BigNumber(decimals);
    } catch (err) {
      return null;
    }
    if (
      this.gtZero(xtzPool_) &&
      this.gtZero(tokenPool_) &&
      this.geqZero(decimals_)
    ) {
      let xtzPool__ = xtzPool_.times(Math.pow(10, -6));
      let tokenPool__ = tokenPool_.times(Math.pow(10, -decimals_.toNumber()));
      return xtzPool__.dividedBy(tokenPool__);
    } else {
      return null;
    }
  }

  /**
   * Calculate the tokenToXtz price impact for a give Dexter contract. Price
   * impact is a measure of how much a trade will alter the future price.
   *
   * @param {(BigNumber|number|string)} tokenIn - The amount of Token the sender will sell to Dexter in tokenToXtz.
   * @param {(BigNumber|number|string)} xtzPool - XTZ amount that Dexter holds. Must be greater than zero.
   * @param {(BigNumber|number|string)} tokenPool - Token amount that Dexter holds. Must be greater than zero.
   * @param {number} burnPercent - A number between 0.0 and 100, denoting the percentage of the tokens that will be burned by the dex during the trade.
   * @param {boolean} includeSubsidy - In the case of liquidity baking, a subsudy will be added per block, affecting the calcualtion. This boolean is used to control whether or not this is taken into account.
   * @returns {(BigNumber|null)} - The price impact percentage as a float value.
   */
  tokenToXtzPriceImpact(
    tokenIn: numericInput,
    xtzPool: numericInput,
    tokenPool: numericInput,
    burnPercent: number
  ): BigNumber | null {
    let tokenIn_ = new BigNumber(0);
    let xtzPool_ = new BigNumber(0);
    let tokenPool_ = new BigNumber(0);
    const burn = 1000 - Math.floor(burnPercent * 10);

    try {
      tokenIn_ = new BigNumber(tokenIn);
      xtzPool_ = new BigNumber(xtzPool);
      tokenPool_ = new BigNumber(tokenPool);
    } catch (err) {
      return null;
    }
    if (this.isLbContract) {
      xtzPool_ = this.creditSubsidy(xtzPool_);
    }
    if (
      this.gtZero(tokenIn_) &&
      this.gtZero(xtzPool_) &&
      this.gtZero(tokenPool_)
    ) {
      const midPrice = xtzPool_.dividedBy(tokenPool_);
      const xtzBought = tokenIn_
        .times(xtzPool_)
        .dividedBy(tokenIn_.plus(tokenPool_));
      const xtzBoughtNetBurn = xtzBought
        .times(new BigNumber(burn))
        .dividedBy(new BigNumber(1000));
      // if no tokens have been purchased then there is no price impact
      if (this.leqZero(xtzBoughtNetBurn)) {
        return new BigNumber(0);
      }
      const exactQuote = midPrice.times(tokenIn_);
      return exactQuote.minus(xtzBoughtNetBurn).dividedBy(exactQuote);
    } else {
      return null;
    }
  }

  /**
   * Calculate the minimum token out to be sent to dexter for a given max xtzOut
   * and the max allowed slippage rate the user accepts.  If the exchange rate
   * has lowered less than the user's allowed slippage at the time of execution,
   * then the trade will fail.
   *
   * @param {(BigNumber|number|string)} xtzOut - XTZ out as calculated by tokenToXtzTokenOut. Must be greater than zero.
   * @param {number} allowedSlippage - Maximum slippage rate that a user will except for an exchange. Must be between 0.00 and 1.00.
   * @returns {(BigNumber|null)} The minimum token amount to send to the tokenToXtz entrypoint.
   */
  tokenToXtzMinimumXtzOutput(
    xtzOut: BigNumber,
    allowedSlippage: number
  ): BigNumber | null {
    if (
      this.gtZero(new BigNumber(xtzOut)) &&
      allowedSlippage >= 0.0 &&
      allowedSlippage <= 1.0
    ) {
      // ((xtzOut * 1000) - ((xtzOut * 1000) * (allowedSlippage * 100000) / 100000)) / 1000
      const xtzOut_ = new BigNumber(xtzOut).times(new BigNumber(1000));
      const allowedSlippage_ = new BigNumber(
        Math.floor(allowedSlippage * 1000 * 100)
      );
      const result = xtzOut_
        .minus(xtzOut_.times(allowedSlippage_).dividedBy(new BigNumber(100000)))
        .dividedBy(1000);
      return BigNumber.maximum(result, new BigNumber(1));
    } else {
      return null;
    }
  }

  /**
   * =============================================================================
   * addLiquidity entrypoint functions
   * =============================================================================
   */

  /**
   * Get the amount of liquidity created and rewarded given an XTZ input,
   * the current liquidity in Dexter and the amount of XTZ held by Dexter.
   * Note that the token amount does not affect the liquidity.
   *
   * @param {(BigNumber|number|string)} xtzIn - XTZ amount the sender gives to Dexter for liquidity. Must be greater than zero.
   * @param {(BigNumber|number|string)} xtzPool - XTZ amount that Dexter holds.  Must be greater than zero.
   * @param {(BigNumber|number|string)} totalLiquidity - Total amount of liquidity in a Dexter pool. Must be greater than or equal to zero.
   * @param {boolean} includeSubsidy - In the case of liquidity baking, a subsudy will be added per block, affecting the calcualtion. This boolean is used to control whether or not this is taken into account.
   * @returns {(BigNumber|null)} The amount of liquidity that the sender gains.
   */
  addLiquidityLiquidityCreated(
    xtzIn: numericInput,
    xtzPool: numericInput,
    totalLiquidity: numericInput
  ): BigNumber | null {
    let xtzIn_ = new BigNumber(0);
    let xtzPool_ = new BigNumber(0);
    let totalLiquidity_ = new BigNumber(0);
    try {
      xtzIn_ = new BigNumber(xtzIn);
      xtzPool_ = new BigNumber(xtzPool);
      totalLiquidity_ = new BigNumber(totalLiquidity);
    } catch (err) {
      return null;
    }
    if (this.isLbContract) {
      xtzPool_ = this.creditSubsidy(xtzPool_);
    }
    if (this.gtZero(xtzIn_) && this.gtZero(xtzPool_)) {
      if (this.eqZero(totalLiquidity_)) {
        return new BigNumber(xtzIn)
          .times(new BigNumber(totalLiquidity))
          .dividedBy(new BigNumber(xtzPool));
      } else if (this.gtZero(totalLiquidity_)) {
        return new BigNumber(xtzIn)
          .times(new BigNumber(totalLiquidity))
          .dividedBy(new BigNumber(xtzPool));
      }
      return null;
    } else {
      return null;
    }
  }

  /**
   * For a given amount of xtzIn and the state of the Dexter xtz pool and token
   * pool. Calculate the minimum amount of tokens the user would be required
   * to deposit. If totalLiquidity is zero then sender must deposit at least one
   * XTZ (1,000,000 mutez) and one token. The exchange rate is not set.
   *
   * @param {(BigNumber|number|string)} xtzIn - XTZ amount the sender gives to Dexter for liquidity. Must be greater than zero.
   * @param {(BigNumber|number|string)} xtzPool - XTZ amount that Dexter holds. Must be greater than zero.
   * @param {(BigNumber|number|string)} tokenPool - Token amount that Dexter holds. Must be greater than zero.
   * @param {boolean} includeSubsidy - In the case of liquidity baking, a subsudy will be added per block, affecting the calcualtion. This boolean is used to control whether or not this is taken into account.
   * @returns {(BigNumber|null)} The amount of liquidity that the sender gains.
   */
  addLiquidityTokenIn(
    xtzIn: numericInput,
    xtzPool: numericInput,
    tokenPool: numericInput
  ): BigNumber | null {
    let xtzIn_ = new BigNumber(0);
    let xtzPool_ = new BigNumber(0);
    let tokenPool_ = new BigNumber(0);
    try {
      xtzIn_ = new BigNumber(xtzIn);
      xtzPool_ = new BigNumber(xtzPool);
      tokenPool_ = new BigNumber(tokenPool);
    } catch (err) {
      return null;
    }
    if (this.isLbContract) {
      xtzPool_ = this.creditSubsidy(xtzPool_);
    }
    if (
      this.gtZero(xtzIn_) &&
      this.gtZero(xtzPool_) &&
      this.gtZero(tokenPool_)
    ) {
      // cdiv(xtzIn_ * tokenPool_, xtzPool_)
      return this.ceilingDiv(xtzIn_.times(tokenPool_), xtzPool_);
    } else {
      return null;
    }
  }

  /**
   * For a given amount of tokenIn and the state of the Dexter xtz pool and token
   * pool. Calculate the minimum amount of XTZ the user would be required
   * to deposit. If totalLiquidity is zero then sender must deposit at least one
   * XTZ (1,000,000 mutez) and one token. The exchange rate is not set.
   *
   * @param {(BigNumber|number|string)} tokenIn - Token amount the sender gives to Dexter for liquidity.
   * @param {(BigNumber|number|string)} xtzPool - XTZ amount that Dexter holds.
   * @param {(BigNumber|number|string)} tokenPool Token amount that Dexter holds.
   * @param {boolean} includeSubsidy - In the case of liquidity baking, a subsudy will be added per block, affecting the calcualtion. This boolean is used to control whether or not this is taken into account.
   * @returns {{BigNumber|null}} The amount of liquidity that the sender gains.
   */
  addLiquidityXtzIn(
    tokenIn: numericInput,
    xtzPool: numericInput,
    tokenPool: numericInput
  ): BigNumber | null {
    let tokenIn_ = new BigNumber(0);
    let xtzPool_ = new BigNumber(0);
    let tokenPool_ = new BigNumber(0);
    try {
      tokenIn_ = new BigNumber(tokenIn);
      xtzPool_ = new BigNumber(xtzPool);
      tokenPool_ = new BigNumber(tokenPool);
    } catch (err) {
      return null;
    }
    if (this.isLbContract) {
      xtzPool_ = this.creditSubsidy(xtzPool_);
    }
    if (
      this.gtZero(tokenIn_) &&
      this.gtZero(xtzPool_) &&
      this.gtZero(tokenPool_)
    ) {
      // div(tokenIn_ * xtzPool_, tokenPool_)
      return tokenIn_.times(xtzPool_).dividedBy(tokenPool_);
    } else {
      return null;
    }
  }

  /**
   * =============================================================================
   * removeLiquidity entrypoint functions
   * =============================================================================
   */

  /**
   * Calculate the amount of token a sender would receive for burning a certain amount
   * of liquidity given a Dexter exchange that has a certain amount of
   * total liquidity and holds an amount of token.
   *
   * @param {(BigNumber|number|string)} liquidityBurned LQT that the sender burns.
   * @param {(BigNumber|number|string)} totalLiquidity The total amount of liquidity in a Dexter exchange.
   * @param {(BigNumber|number|string)} tokenPool amount of token that Dexter holds.
   * @returns {(BigNumber|null)} The amount of token that the sender gains.
   */
  removeLiquidityTokenOut(
    liquidityBurned: numericInput,
    totalLiquidity: numericInput,
    tokenPool: numericInput
  ): BigNumber | null {
    let liquidityBurned_ = new BigNumber(0);
    let totalLiquidity_ = new BigNumber(0);
    let tokenPool_ = new BigNumber(0);
    try {
      liquidityBurned_ = new BigNumber(liquidityBurned);
      totalLiquidity_ = new BigNumber(totalLiquidity);
      tokenPool_ = new BigNumber(tokenPool);
    } catch (err) {
      return null;
    }
    if (
      this.gtZero(liquidityBurned_) &&
      this.gtZero(totalLiquidity_) &&
      this.gtZero(tokenPool_)
    ) {
      // tokenPool_ * liquidityBurned_ / totalLiquidity_
      return tokenPool_.times(liquidityBurned_).dividedBy(totalLiquidity_);
    } else {
      return null;
    }
  }

  /**
   * Calculate the amount of XTZ a sender would receive for burning a certain amount
   * of liquidity given a Dexter exchange that has a certain amount of
   * total liquidity and holds an amount of XTZ.
   *
   * @param {(BigNumber|number|string)} liquidityBurned LQT that the sender burns.
   * @param {(BigNumber|number|string)} totalLiquidity The total amount of liquidity in a Dexter exchange.
   * @param {(BigNumber|number|string)} xtzPool amount of token that Dexter holds.
   * @param {boolean} includeSubsidy - In the case of liquidity baking, a subsudy will be added per block, affecting the calcualtion. This boolean is used to control whether or not this is taken into account.
   * @returns {(BigNumber|null)} The amount of XTZ that the sender gains.
   */
  removeLiquidityXtzOut(
    liquidityBurned: numericInput,
    totalLiquidity: numericInput,
    xtzPool: numericInput
  ): BigNumber | null {
    let liquidityBurned_ = new BigNumber(0);
    let totalLiquidity_ = new BigNumber(0);
    let xtzPool_ = new BigNumber(0);
    try {
      liquidityBurned_ = new BigNumber(liquidityBurned);
      totalLiquidity_ = new BigNumber(totalLiquidity);
      xtzPool_ = new BigNumber(xtzPool);
    } catch (err) {
      return null;
    }
    if (this.isLbContract) {
      xtzPool_ = this.creditSubsidy(xtzPool_);
    }
    if (
      this.gtZero(liquidityBurned_) &&
      this.gtZero(totalLiquidity_) &&
      this.gtZero(xtzPool_)
    ) {
      // xtzPool_ * liquidityBurned_ / totalLiquidity_
      return xtzPool_.times(liquidityBurned_).dividedBy(totalLiquidity_);
    } else {
      return null;
    }
  }
}

// NOT THE CLASS

//const dexterCalculations = (function (undefined) {

/**
 * Many functions use {(BigNumber|number|string)} as parameter. These parameters
 * are converted into bigInt from the big-integer package and are expected to
 * to be non-negative numbers. string should be a string encoded integer. If you
 * are interfacing this project from another programming language, you should
 * pass the value for the parameter in {(BigNumber|number|string)} as a string to
 * avoid number size restrictions in JavaScript.
 */

/**
 * =============================================================================
 * Internal utility functions
 * =============================================================================
 */

/*return {
    // xtzToToken
    xtzToTokenTokenOutput: xtzToTokenTokenOutput,
    xtzToTokenXtzInput: xtzToTokenXtzInput,
    xtzToTokenExchangeRate: xtzToTokenExchangeRate,
    xtzToTokenExchangeRateForDisplay: xtzToTokenExchangeRateForDisplay,
    xtzToTokenMarketRate: xtzToTokenMarketRate,
    xtzToTokenPriceImpact: xtzToTokenPriceImpact,
    xtzToTokenMinimumTokenOutput: xtzToTokenMinimumTokenOutput,
    totalLiquidityProviderFee: totalLiquidityProviderFee,
    liquidityProviderFee: liquidityProviderFee,

    // tokenToXtz
    tokenToXtzXtzOutput: tokenToXtzXtzOutput,
    tokenToXtzTokenInput: tokenToXtzTokenInput,
    tokenToXtzExchangeRate: tokenToXtzExchangeRate,
    tokenToXtzExchangeRateForDisplay: tokenToXtzExchangeRateForDisplay,
    tokenToXtzMarketRate: tokenToXtzMarketRate,
    tokenToXtzPriceImpact: tokenToXtzPriceImpact,
    tokenToXtzMinimumXtzOutput: tokenToXtzMinimumXtzOutput,

    // addLiquidity
    addLiquidityLiquidityCreated: addLiquidityLiquidityCreated,
    addLiquidityTokenIn: addLiquidityTokenIn,
    addLiquidityXtzIn: addLiquidityXtzIn,

    // removeLiquidity
    removeLiquidityTokenOut: removeLiquidityTokenOut,
    removeLiquidityXtzOut: removeLiquidityXtzOut
  };
})();

// Node.js check
if (typeof module !== "undefined" && module.hasOwnProperty("exports")) {
  module.exports = dexterCalculations;
}*/

// amd check
/*if (typeof define === "function" && define.amd) {
  define(function () {
    return dexterCalculations;
  });
}*/
