"use strict";
exports.__esModule = true;
var bignumber_js_1 = require("bignumber.js");
var dexterCalculations = (function (undefined) {
    "use strict";
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
    /**
     * Test if a bigInt is greater than zero.
     *
     * @param {BigNumber} x
     * @returns {boolean} x > 0
     */
    function gtZero(x) {
        return x.isGreaterThan(new bignumber_js_1["default"](0));
    }
    /**
     * Test if a bigInt is greater than or equal to zero.
     *
     * @param {BigNumber} x
     * @returns {boolean} x >= 0
     */
    function geqZero(x) {
        return x.isGreaterThanOrEqualTo(new bignumber_js_1["default"](0));
    }
    /**
     * Test if a bigInt is equal to zero.
     *
     * @param {BigNumber} x
     * @returns {boolean} x == 0
     */
    function eqZero(x) {
        return x.isZero();
    }
    /**
     * Test if a bigInt is less than or equal to zero.
     *
     * @param {BigNumber} x
     * @returns {boolean} x <= 0
     */
    function leqZero(x) {
        return x.isLessThanOrEqualTo(new bignumber_js_1["default"](0));
    }
    /**
     * Ceiling division. If the remainder is greater than zero, increment by one.
     *
     * @param {BigNumber} x
     * @param {BigNumber} y
     * @returns {BigNumber} if rem(x,y) > 0 then (x/y+1) else (x/y)
     */
    function ceilingDiv(x, y) {
        var result = x.mod(y);
        if (result.isGreaterThanOrEqualTo(new bignumber_js_1["default"](0))) {
            return x.dividedBy(y).plus(new bignumber_js_1["default"](1));
        }
        return x.dividedBy(y);
    }
    /**
     * Updates xtzPool with the 2.5 tez subsidy. Since this is applied before all other operations it can be assumed to have been applied at least once for any call to the CPMM.
     *
     * @param {BigNumber} xtzPool
     * @returns {BigNumber} xtzPool + 2_500_000
     */
    function creditSubsidy(xtzPool) {
        return xtzPool.plus(new bignumber_js_1["default"](2500000));
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
    function xtzToTokenTokenOutput(xtzIn, xtzPool, tokenPool, feePercent, burnPercent, includeSubsidy) {
        // TODO: check the line below
        //const xtzPool = xtzPool;
        if (includeSubsidy) {
            xtzPool = creditSubsidy(new bignumber_js_1["default"](xtzPool));
        }
        var xtzIn_ = new bignumber_js_1["default"](0);
        var xtzPool_ = new bignumber_js_1["default"](0);
        var tokenPool_ = new bignumber_js_1["default"](0);
        var fee = 1000 - Math.floor(feePercent * 10);
        var burn = 1000 - Math.floor(burnPercent * 10);
        var feeMultiplier = fee * burn;
        try {
            xtzIn_ = new bignumber_js_1["default"](xtzIn);
            xtzPool_ = new bignumber_js_1["default"](xtzPool);
            tokenPool_ = new bignumber_js_1["default"](tokenPool);
        }
        catch (err) {
            return null;
        }
        if (gtZero(xtzIn_) && gtZero(xtzPool_) && gtZero(tokenPool_)) {
            // Includes constiable fee (0.1% for LB, 0.3 for Quipu) and constiable burn (0.1% for LB, 0% for Quipu) calculated separatedly: e.g. 0.1% for both:  999/1000 * 999/1000 = 998100/1000000
            // (xtzIn_ * tokenPool_ * 999 * 999) / (tokenPool * 1000 - tokenOut * 999 * 999)
            var numerator = xtzIn_
                .times(tokenPool_)
                .times(new bignumber_js_1["default"](feeMultiplier));
            var denominator = xtzPool_
                .times(new bignumber_js_1["default"](1000000))
                .plus(xtzIn_.times(new bignumber_js_1["default"](feeMultiplier)));
            return numerator.dividedBy(denominator);
        }
        else {
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
    function xtzToTokenXtzInput(tokenOut, xtzPool, tokenPool, decimals, feePercent, burnPercent, includeSubsidy) {
        //const xtzPool = xtzPool;
        if (includeSubsidy) {
            xtzPool = creditSubsidy(new bignumber_js_1["default"](xtzPool));
        }
        var tokenOut_ = new bignumber_js_1["default"](0);
        var xtzPool_ = new bignumber_js_1["default"](0);
        var tokenPool_ = new bignumber_js_1["default"](0);
        var decimals_ = new bignumber_js_1["default"](0);
        var fee = 1000 - Math.floor(feePercent * 10);
        var burn = 1000 - Math.floor(burnPercent * 10);
        var feeMultiplier = fee * burn;
        try {
            tokenOut_ = new bignumber_js_1["default"](tokenOut);
            xtzPool_ = new bignumber_js_1["default"](xtzPool);
            tokenPool_ = new bignumber_js_1["default"](tokenPool);
            decimals_ = new bignumber_js_1["default"](decimals);
        }
        catch (err) {
            return null;
        }
        if (gtZero(tokenOut_) &&
            gtZero(xtzPool_) &&
            gtZero(tokenPool_) &&
            geqZero(decimals_)) {
            // Includes constiable fee (0.1% for LB, 0.3 for Quipu) and constiable burn (0.1% for LB, 0% for Quipu) calculated separatedly: e.g. 0.1% for both:  999/1000 * 999/1000 = 998100/1000000
            // (xtzPool_ * tokenOut_ * 1000 * 1000 * 10 ** decimals) / (tokenPool - tokenOut * 999 * 999 * 10 ** decimals))
            var result = xtzPool_
                .times(tokenOut_)
                .times(new bignumber_js_1["default"](1000000))
                .times(Math.pow(10, decimals_.toNumber()))
                .dividedBy(tokenPool_
                .minus(tokenOut_)
                .times(new bignumber_js_1["default"](feeMultiplier).times(Math.pow(10, decimals_.toNumber()))));
            if (gtZero(result)) {
                return result;
            }
            return null;
        }
        else {
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
    function xtzToTokenExchangeRate(xtzIn, xtzPool, tokenPool, feePercent, burnPercent, includeSubsidy) {
        var xtzIn_ = new bignumber_js_1["default"](0);
        var xtzPool_ = new bignumber_js_1["default"](0);
        var tokenPool_ = new bignumber_js_1["default"](0);
        try {
            xtzIn_ = new bignumber_js_1["default"](xtzIn);
            xtzPool_ = new bignumber_js_1["default"](xtzPool);
            tokenPool_ = new bignumber_js_1["default"](tokenPool);
        }
        catch (err) {
            return null;
        }
        if (gtZero(xtzIn_) && gtZero(xtzPool_) && gtZero(tokenPool_)) {
            var tokenOutput = xtzToTokenTokenOutput(xtzIn_, xtzPool_, tokenPool_, feePercent, burnPercent, includeSubsidy);
            if (tokenOutput === null)
                return null;
            return tokenOutput.dividedBy(xtzIn_);
        }
        else {
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
    function xtzToTokenExchangeRateForDisplay(xtzIn, xtzPool, tokenPool, decimals, feePercent, burnPercent, includeSubsidy) {
        var xtzIn_ = new bignumber_js_1["default"](0);
        var xtzPool_ = new bignumber_js_1["default"](0);
        var tokenPool_ = new bignumber_js_1["default"](0);
        try {
            xtzIn_ = new bignumber_js_1["default"](xtzIn);
            xtzPool_ = new bignumber_js_1["default"](xtzPool);
            tokenPool_ = new bignumber_js_1["default"](tokenPool);
        }
        catch (err) {
            return null;
        }
        if (gtZero(xtzIn_) && gtZero(xtzPool_) && gtZero(tokenPool_)) {
            var tokenOutput = xtzToTokenTokenOutput(xtzIn_, xtzPool_, tokenPool_, feePercent, burnPercent, includeSubsidy);
            if (tokenOutput === null)
                return null;
            return tokenOutput
                .times(Math.pow(10, -decimals))
                .dividedBy(xtzIn_.times(Math.pow(10, -6)));
        }
        else {
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
    function xtzToTokenMarketRate(xtzPool, tokenPool, decimals) {
        var xtzPool_ = new bignumber_js_1["default"](0);
        var tokenPool_ = new bignumber_js_1["default"](0);
        var decimals_ = new bignumber_js_1["default"](0);
        try {
            xtzPool_ = new bignumber_js_1["default"](xtzPool);
            tokenPool_ = new bignumber_js_1["default"](tokenPool);
            decimals_ = new bignumber_js_1["default"](decimals);
        }
        catch (err) {
            return null;
        }
        if (gtZero(xtzPool_) && gtZero(tokenPool_) && geqZero(decimals_)) {
            var xtzPool__ = xtzPool_.times(Math.pow(10, -6));
            var tokenPool__ = tokenPool_.times(Math.pow(10, -decimals_.toNumber()));
            return tokenPool__.dividedBy(xtzPool__);
        }
        else {
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
    function xtzToTokenPriceImpact(xtzIn, xtzPool, tokenPool, burnPercent, includeSubsidy) {
        var xtzIn_ = new bignumber_js_1["default"](0);
        var xtzPool_ = new bignumber_js_1["default"](0);
        var tokenPool_ = new bignumber_js_1["default"](0);
        var burn = 1000 - Math.floor(burnPercent * 10);
        try {
            xtzIn_ = new bignumber_js_1["default"](xtzIn);
            xtzPool_ = new bignumber_js_1["default"](xtzPool);
            tokenPool_ = new bignumber_js_1["default"](tokenPool);
        }
        catch (err) {
            return null;
        }
        if (includeSubsidy) {
            xtzPool_ = creditSubsidy(xtzPool_);
        }
        if (gtZero(xtzIn_) && gtZero(xtzPool_) && gtZero(tokenPool_)) {
            var midPrice = tokenPool_.times(xtzPool_);
            var xtzInNetBurn = xtzIn_.times(burn).dividedBy(1000);
            var tokensBought = xtzInNetBurn
                .times(tokenPool_)
                .dividedBy(xtzInNetBurn.plus(xtzPool_));
            // if no tokens have been purchased then there is no price impact
            if (leqZero(tokensBought)) {
                return new bignumber_js_1["default"](0);
            }
            var exactQuote = midPrice.times(xtzIn_);
            return exactQuote.minus(tokensBought).dividedBy(exactQuote);
        }
        else {
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
    function xtzToTokenMinimumTokenOutput(tokenOut, allowedSlippage) {
        if (tokenOut > 0 && allowedSlippage >= 0.0 && allowedSlippage <= 1.0) {
            // ((tokenOut * 1000) - ((tokenOut * 1000) * (allowedSlippage * 100000) / 100000)) / 1000
            var tokenOut_ = new bignumber_js_1["default"](tokenOut).times(new bignumber_js_1["default"](1000));
            var allowedSlippage_ = new bignumber_js_1["default"](Math.floor(allowedSlippage * 1000 * 100));
            var result = tokenOut_
                .minus(tokenOut_.times(allowedSlippage_).dividedBy(new bignumber_js_1["default"](100000)))
                .dividedBy(1000);
            return bignumber_js_1["default"].maximum(result, new bignumber_js_1["default"](1));
        }
        else {
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
    function totalLiquidityProviderFee(xtzIn) {
        var xtzIn_ = new bignumber_js_1["default"](0);
        try {
            xtzIn_ = new bignumber_js_1["default"](xtzIn);
        }
        catch (err) {
            return null;
        }
        if (gtZero(xtzIn_)) {
            return new bignumber_js_1["default"](xtzIn_).times(new bignumber_js_1["default"](1)).dividedBy(1000);
        }
        else {
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
    function liquidityProviderFee(xtzIn, totalLiquidity, userLiquidity) {
        var xtzIn_ = new bignumber_js_1["default"](0);
        var totalLiquidity_ = new bignumber_js_1["default"](0);
        var userLiquidity_ = new bignumber_js_1["default"](0);
        try {
            xtzIn_ = new bignumber_js_1["default"](xtzIn);
            totalLiquidity_ = new bignumber_js_1["default"](totalLiquidity);
            userLiquidity_ = new bignumber_js_1["default"](userLiquidity);
        }
        catch (err) {
            return null;
        }
        if (gtZero(xtzIn_) && gtZero(totalLiquidity_) && gtZero(userLiquidity_)) {
            var fee = totalLiquidityProviderFee(xtzIn_);
            if (fee === null)
                return null;
            return fee.dividedBy(totalLiquidity_.dividedBy(userLiquidity_));
        }
        else {
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
    function tokenToXtzXtzOutput(tokenIn, xtzPool, tokenPool, feePercent, burnPercent, includeSubsidy) {
        var tokenIn_ = new bignumber_js_1["default"](0);
        var xtzPool_ = new bignumber_js_1["default"](0);
        var tokenPool_ = new bignumber_js_1["default"](0);
        var fee = 1000 - Math.floor(feePercent * 10);
        var burn = 1000 - Math.floor(burnPercent * 10);
        var feeAndBurnMultiplier = fee * burn;
        var feeMultiplier = fee * 1000;
        try {
            tokenIn_ = new bignumber_js_1["default"](tokenIn);
            xtzPool_ = new bignumber_js_1["default"](xtzPool);
            tokenPool_ = new bignumber_js_1["default"](tokenPool);
        }
        catch (err) {
            return null;
        }
        if (includeSubsidy) {
            xtzPool_ = creditSubsidy(xtzPool_);
        }
        if (gtZero(tokenIn_) && gtZero(xtzPool_) && gtZero(tokenPool_)) {
            // Includes constiable fee (0.1% for LB, 0.3 for Quipu) and constiable burn (0.1% for LB, 0% for Quipu) calculated separatedly: e.g. 0.1% for both:  999/1000 * 999/1000 = 998100/1000000
            var numerator = new bignumber_js_1["default"](tokenIn)
                .times(new bignumber_js_1["default"](xtzPool))
                .times(new bignumber_js_1["default"](feeAndBurnMultiplier));
            var denominator = new bignumber_js_1["default"](tokenPool)
                .times(new bignumber_js_1["default"](1000000))
                .plus(new bignumber_js_1["default"](tokenIn).times(new bignumber_js_1["default"](feeMultiplier)));
            return numerator.dividedBy(denominator);
        }
        else {
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
    function tokenToXtzTokenInput(xtzOut, xtzPool, tokenPool, decimals, feePercent, burnPercent, includeSubsidy) {
        var xtzOut_ = new bignumber_js_1["default"](0);
        var xtzPool_ = new bignumber_js_1["default"](0);
        var tokenPool_ = new bignumber_js_1["default"](0);
        var decimals_ = new bignumber_js_1["default"](0);
        var fee = 1000 - Math.floor(feePercent * 10);
        var burn = 1000 - Math.floor(burnPercent * 10);
        var feeAndBurnMultiplier = fee * burn;
        var feeMultiplier = fee * 1000;
        try {
            xtzOut_ = new bignumber_js_1["default"](xtzOut);
            xtzPool_ = new bignumber_js_1["default"](xtzPool);
            tokenPool_ = new bignumber_js_1["default"](tokenPool);
            decimals_ = new bignumber_js_1["default"](decimals);
        }
        catch (err) {
            return null;
        }
        if (includeSubsidy) {
            xtzPool_ = creditSubsidy(xtzPool_);
        }
        if (gtZero(xtzOut_) &&
            gtZero(xtzPool_) &&
            gtZero(tokenPool_) &&
            geqZero(decimals_)) {
            // Includes constiable fee (0.1% for LB, 0.3 for Quipu) and constiable burn (0.1% for LB, 0% for Quipu) calculated separatedly: e.g. 0.1% for both:  999/1000 * 999/1000 = 998100/1000000
            // (tokenPool_ * xtzOut_ * 1000 * 1000 * 10 ** decimals) / ((xtzPool * 999 * 1000 - xtzOut * 999 * 999) * 10 ** decimals))
            var result = tokenPool_
                .times(xtzOut_)
                .times(new bignumber_js_1["default"](1000000))
                .times(Math.pow(10, decimals_.toNumber()))
                .dividedBy(xtzPool_
                .times(new bignumber_js_1["default"](feeMultiplier))
                .minus(xtzOut_.times(new bignumber_js_1["default"](feeAndBurnMultiplier)))
                .times(Math.pow(10, decimals_.toNumber())));
            if (gtZero(result)) {
                return result;
            }
            return null;
        }
        else {
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
    function tokenToXtzExchangeRate(tokenIn, xtzPool, tokenPool, feePercent, burnPercent, includeSubsidy) {
        var tokenIn_ = new bignumber_js_1["default"](0);
        var xtzPool_ = new bignumber_js_1["default"](0);
        var tokenPool_ = new bignumber_js_1["default"](0);
        try {
            tokenIn_ = new bignumber_js_1["default"](tokenIn);
            xtzPool_ = new bignumber_js_1["default"](xtzPool);
            tokenPool_ = new bignumber_js_1["default"](tokenPool);
        }
        catch (err) {
            return null;
        }
        if (gtZero(tokenIn_) && gtZero(xtzPool_) && gtZero(tokenPool_)) {
            var tokenOutput = tokenToXtzXtzOutput(tokenIn_, xtzPool_, tokenPool_, feePercent, burnPercent, includeSubsidy);
            if (tokenOutput === null)
                return null;
            return tokenOutput.dividedBy(tokenIn_);
        }
        else {
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
    function tokenToXtzExchangeRateForDisplay(tokenIn, xtzPool, tokenPool, decimals, feePercent, burnPercent, includeSubsidy) {
        var tokenIn_ = new bignumber_js_1["default"](0);
        var xtzPool_ = new bignumber_js_1["default"](0);
        var tokenPool_ = new bignumber_js_1["default"](0);
        try {
            tokenIn_ = new bignumber_js_1["default"](tokenIn);
            xtzPool_ = new bignumber_js_1["default"](xtzPool);
            tokenPool_ = new bignumber_js_1["default"](tokenPool);
        }
        catch (err) {
            return null;
        }
        if (gtZero(tokenIn_) && gtZero(xtzPool_) && gtZero(tokenPool_)) {
            var tokenOutput = tokenToXtzXtzOutput(tokenIn_, xtzPool_, tokenPool_, feePercent, burnPercent, includeSubsidy);
            if (tokenOutput === null)
                return null;
            return tokenOutput
                .times(Math.pow(10, -6))
                .dividedBy(tokenIn_.times(Math.pow(10, -decimals.toNumber())));
        }
        else {
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
    function tokenToXtzMarketRate(xtzPool, tokenPool, decimals) {
        var xtzPool_ = new bignumber_js_1["default"](0);
        var tokenPool_ = new bignumber_js_1["default"](0);
        var decimals_ = new bignumber_js_1["default"](0);
        try {
            xtzPool_ = new bignumber_js_1["default"](xtzPool);
            tokenPool_ = new bignumber_js_1["default"](tokenPool);
            decimals_ = new bignumber_js_1["default"](decimals);
        }
        catch (err) {
            return null;
        }
        if (gtZero(xtzPool_) && gtZero(tokenPool_) && geqZero(decimals_)) {
            var xtzPool__ = xtzPool_.times(Math.pow(10, -6));
            var tokenPool__ = tokenPool_.times(Math.pow(10, -decimals_.toNumber()));
            return xtzPool__.dividedBy(tokenPool__);
        }
        else {
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
    function tokenToXtzPriceImpact(tokenIn, xtzPool, tokenPool, burnPercent, includeSubsidy) {
        var tokenIn_ = new bignumber_js_1["default"](0);
        var xtzPool_ = new bignumber_js_1["default"](0);
        var tokenPool_ = new bignumber_js_1["default"](0);
        var burn = 1000 - Math.floor(burnPercent * 10);
        try {
            tokenIn_ = new bignumber_js_1["default"](tokenIn);
            xtzPool_ = new bignumber_js_1["default"](xtzPool);
            tokenPool_ = new bignumber_js_1["default"](tokenPool);
        }
        catch (err) {
            return null;
        }
        if (includeSubsidy) {
            xtzPool_ = creditSubsidy(xtzPool_);
        }
        if (gtZero(tokenIn_) && gtZero(xtzPool_) && gtZero(tokenPool_)) {
            var midPrice = xtzPool_.dividedBy(tokenPool_);
            var xtzBought = tokenIn_
                .times(xtzPool_)
                .dividedBy(tokenIn_.plus(tokenPool_));
            var xtzBoughtNetBurn = xtzBought
                .times(new bignumber_js_1["default"](burn))
                .dividedBy(new bignumber_js_1["default"](1000));
            // if no tokens have been purchased then there is no price impact
            if (leqZero(xtzBoughtNetBurn)) {
                return new bignumber_js_1["default"](0);
            }
            var exactQuote = midPrice.times(tokenIn_);
            return exactQuote.minus(xtzBoughtNetBurn).dividedBy(exactQuote);
        }
        else {
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
    function tokenToXtzMinimumXtzOutput(xtzOut, allowedSlippage) {
        if (gtZero(new bignumber_js_1["default"](xtzOut)) &&
            allowedSlippage >= 0.0 &&
            allowedSlippage <= 1.0) {
            // ((xtzOut * 1000) - ((xtzOut * 1000) * (allowedSlippage * 100000) / 100000)) / 1000
            var xtzOut_ = new bignumber_js_1["default"](xtzOut).times(new bignumber_js_1["default"](1000));
            var allowedSlippage_ = new bignumber_js_1["default"](Math.floor(allowedSlippage * 1000 * 100));
            var result = xtzOut_
                .minus(xtzOut_.times(allowedSlippage_).dividedBy(new bignumber_js_1["default"](100000)))
                .dividedBy(1000);
            return bignumber_js_1["default"].maximum(result, new bignumber_js_1["default"](1));
        }
        else {
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
    function addLiquidityLiquidityCreated(xtzIn, xtzPool, totalLiquidity, includeSubsidy) {
        var xtzIn_ = new bignumber_js_1["default"](0);
        var xtzPool_ = new bignumber_js_1["default"](0);
        var totalLiquidity_ = new bignumber_js_1["default"](0);
        try {
            xtzIn_ = new bignumber_js_1["default"](xtzIn);
            xtzPool_ = new bignumber_js_1["default"](xtzPool);
            totalLiquidity_ = new bignumber_js_1["default"](totalLiquidity);
        }
        catch (err) {
            return null;
        }
        if (includeSubsidy) {
            xtzPool_ = creditSubsidy(xtzPool_);
        }
        if (gtZero(xtzIn_) && gtZero(xtzPool_)) {
            if (eqZero(totalLiquidity_)) {
                return new bignumber_js_1["default"](xtzIn)
                    .times(new bignumber_js_1["default"](totalLiquidity))
                    .dividedBy(new bignumber_js_1["default"](xtzPool));
            }
            else if (gtZero(totalLiquidity_)) {
                return new bignumber_js_1["default"](xtzIn)
                    .times(new bignumber_js_1["default"](totalLiquidity))
                    .dividedBy(new bignumber_js_1["default"](xtzPool));
            }
            return null;
        }
        else {
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
    function addLiquidityTokenIn(xtzIn, xtzPool, tokenPool, includeSubsidy) {
        var xtzIn_ = new bignumber_js_1["default"](0);
        var xtzPool_ = new bignumber_js_1["default"](0);
        var tokenPool_ = new bignumber_js_1["default"](0);
        try {
            xtzIn_ = new bignumber_js_1["default"](xtzIn);
            xtzPool_ = new bignumber_js_1["default"](xtzPool);
            tokenPool_ = new bignumber_js_1["default"](tokenPool);
        }
        catch (err) {
            return null;
        }
        if (includeSubsidy) {
            xtzPool_ = creditSubsidy(xtzPool_);
        }
        if (gtZero(xtzIn_) && gtZero(xtzPool_) && gtZero(tokenPool_)) {
            // cdiv(xtzIn_ * tokenPool_, xtzPool_)
            return ceilingDiv(xtzIn_.times(tokenPool_), xtzPool_);
        }
        else {
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
    function addLiquidityXtzIn(tokenIn, xtzPool, tokenPool, includeSubsidy) {
        var tokenIn_ = new bignumber_js_1["default"](0);
        var xtzPool_ = new bignumber_js_1["default"](0);
        var tokenPool_ = new bignumber_js_1["default"](0);
        try {
            tokenIn_ = new bignumber_js_1["default"](tokenIn);
            xtzPool_ = new bignumber_js_1["default"](xtzPool);
            tokenPool_ = new bignumber_js_1["default"](tokenPool);
        }
        catch (err) {
            return null;
        }
        if (includeSubsidy) {
            xtzPool_ = creditSubsidy(xtzPool_);
        }
        if (gtZero(tokenIn_) && gtZero(xtzPool_) && gtZero(tokenPool_)) {
            // div(tokenIn_ * xtzPool_, tokenPool_)
            return tokenIn_.times(xtzPool_).dividedBy(tokenPool_);
        }
        else {
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
    function removeLiquidityTokenOut(liquidityBurned, totalLiquidity, tokenPool) {
        var liquidityBurned_ = new bignumber_js_1["default"](0);
        var totalLiquidity_ = new bignumber_js_1["default"](0);
        var tokenPool_ = new bignumber_js_1["default"](0);
        try {
            liquidityBurned_ = new bignumber_js_1["default"](liquidityBurned);
            totalLiquidity_ = new bignumber_js_1["default"](totalLiquidity);
            tokenPool_ = new bignumber_js_1["default"](tokenPool);
        }
        catch (err) {
            return null;
        }
        if (gtZero(liquidityBurned_) &&
            gtZero(totalLiquidity_) &&
            gtZero(tokenPool_)) {
            // tokenPool_ * liquidityBurned_ / totalLiquidity_
            return tokenPool_.times(liquidityBurned_).dividedBy(totalLiquidity_);
        }
        else {
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
    function removeLiquidityXtzOut(liquidityBurned, totalLiquidity, xtzPool, includeSubsidy) {
        var liquidityBurned_ = new bignumber_js_1["default"](0);
        var totalLiquidity_ = new bignumber_js_1["default"](0);
        var xtzPool_ = new bignumber_js_1["default"](0);
        try {
            liquidityBurned_ = new bignumber_js_1["default"](liquidityBurned);
            totalLiquidity_ = new bignumber_js_1["default"](totalLiquidity);
            xtzPool_ = new bignumber_js_1["default"](xtzPool);
        }
        catch (err) {
            return null;
        }
        if (includeSubsidy) {
            xtzPool_ = creditSubsidy(xtzPool_);
        }
        if (gtZero(liquidityBurned_) &&
            gtZero(totalLiquidity_) &&
            gtZero(xtzPool_)) {
            // xtzPool_ * liquidityBurned_ / totalLiquidity_
            return xtzPool_.times(liquidityBurned_).dividedBy(totalLiquidity_);
        }
        else {
            return null;
        }
    }
    return {
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
}
// amd check
/*if (typeof define === "function" && define.amd) {
  define(function () {
    return dexterCalculations;
  });
}*/
