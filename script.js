document.getElementById('loadDataButton').addEventListener('click', () => {
    const startDateInput = document.getElementById('startDate').value;
    const endDateInput = document.getElementById('endDate').value;
    const numTopStocks = parseInt(document.getElementById('numTopStocks').value, 10);
    
    if (!startDateInput || !endDateInput) {
        alert('Please select both start and end dates');
        return;
    }
    if (isNaN(numTopStocks) || numTopStocks < 1 || numTopStocks > 50) {
        alert('Please enter a valid number of top stocks between 1 and 50');
        return;
    }

    const [startYear, startMonth] = startDateInput.split('-');
    const [endYear, endMonth] = endDateInput.split('-');
    
    const startDate = new Date(startYear, startMonth - 1, 1);
    const endDate = new Date(endYear, endMonth, 0);

    const stocks = ["ADANIPORTS.json", "ASIANPAINT.json", "AXISBANK.json", "BAJAJ-AUTO.json", "BAJAJFINSV.json", "BAJFINANCE.json" , "BHARTIARTL.json", "BPCL.json" , "BRITANNIA.json" , "CIPLA.json",
        "COALINDIA.json" , "DRREDDY.json" , "EICHERMOT.json" , "GAIL.json" , "GRASIM.json" , "HCLTECH.json" , "HDFC.json" , "HDFCBANK.json" , "HEROMOTOCO.json" , "HINDALCO.json",
        "HINDUNILVR.json" , "ICICIBANK.json" , "INDUSINDBK.json" , "INFY.json" , "IOC.json" , "ITC.json" , "JSWSTEEL.json" , "KOTAKBANK.json" , "LT.json" , "MARUTI.json"
    ];

    Promise.all(stocks.map(stock => fetch(`data/${stock}`).then(response => response.json())))
        .then(data => {
            let cumulativeReturnNifty50 = 1;
            let cumulativeReturnTopStocks = 1;
            let selectedStocks = [];

            for (let currentYear = parseInt(startYear); currentYear <= parseInt(endYear); currentYear++) {
                for (let currentMonth = (currentYear === parseInt(startYear) ? parseInt(startMonth) : 1); currentMonth <= (currentYear === parseInt(endYear) ? parseInt(endMonth) : 12); currentMonth++) {
                    const monthStartDate = new Date(currentYear, currentMonth - 1, 1);
                    const monthEndDate = new Date(currentYear, currentMonth, 0);

                    const previousMonthStartDate = new Date(currentYear, currentMonth - 2, 1);
                    const previousMonthEndDate = new Date(currentYear, currentMonth - 1, 0);

                    const stockReturns = data.map(stockData => {
                        const previousMonthData = stockData.filter(item => {
                            const itemDate = new Date(item.Date);
                            return itemDate >= previousMonthStartDate && itemDate <= previousMonthEndDate;
                        });

                        const monthlyData = stockData.filter(item => {
                            const itemDate = new Date(item.Date);
                            return itemDate >= monthStartDate && itemDate <= monthEndDate;
                        });

                        if (monthlyData.length < 2) return { symbol: stockData[0].Symbol, return: -Infinity, previousReturn: -Infinity };

                        const startPrice = monthlyData[0].Close;
                        const endPrice = monthlyData[monthlyData.length - 1].Close;
                        const stockReturn = ((endPrice - startPrice) / startPrice) * 100;

                        let previousReturn = -Infinity;
                        if (previousMonthData.length >= 2) {
                            const previousStartPrice = previousMonthData[0].Close;
                            const previousEndPrice = previousMonthData[previousMonthData.length - 1].Close;
                            previousReturn = ((previousEndPrice - previousStartPrice) / previousStartPrice) * 100;
                        }

                        return { symbol: stockData[0].Symbol, return: stockReturn, previousReturn: previousReturn };
                    });

                    // Sort stocks based on previous month return in descending order
                    stockReturns.sort((a, b) => b.previousReturn - a.previousReturn);
                    const topStocks = stockReturns.slice(0, numTopStocks);

                    const avgReturnNifty50 = stockReturns.reduce((acc, stock) => acc + stock.return, 0) / stockReturns.length;
                    const avgReturnTopStocks = topStocks.reduce((acc, stock) => acc + stock.return, 0) / topStocks.length;

                    // console.log(avgReturnNifty50);
                    // console.log(avgReturnTopStocks);


                    cumulativeReturnNifty50 *= (1 + avgReturnNifty50 / 100); // Divide annual return by 12 for monthly compounding
                    cumulativeReturnTopStocks *= (1 + avgReturnTopStocks / 100); // Divide annual return by 12 for monthly compounding



                    // Collect selected stocks and previous month returns for display
                    selectedStocks.push({
                        month: currentMonth,
                        year: currentYear,
                        stocks: topStocks.map(stock => ({
                            symbol: stock.symbol,
                            return: stock.return.toFixed(2),
                            previousReturn: stock.previousReturn.toFixed(2)
                        }))
                    });
                }
            }
            // console.log(cumulativeReturnNifty50);
            // console.log(cumulativeReturnTopStocks);

            const totalMonths = (parseInt(endYear) - parseInt(startYear)) * 12 + (parseInt(endMonth) - parseInt(startMonth)) + 1;
            const totalCumulativeReturnNifty50 = (cumulativeReturnNifty50- 1) * 100;
            const totalCumulativeReturnTopStocks = (cumulativeReturnTopStocks- 1) * 100;

            const resultsDiv = document.getElementById('results');
            resultsDiv.innerHTML = `
                <div class="stock-item">Cumulative Return for Nifty 50: ${totalCumulativeReturnNifty50.toFixed(2)}%</div>
                <div class="stock-item">Cumulative Return for Top ${numTopStocks} Stocks: ${totalCumulativeReturnTopStocks.toFixed(2)}%</div>
            `;

            // Display selected stocks and previous month returns for each month
            const selectedStocksDiv = document.createElement('div');
            selectedStocksDiv.className = 'selected-stocks';
            selectedStocksDiv.innerHTML = `<h2>Selected Stocks Each Month</h2>`;
            
            selectedStocks.forEach(selection => {
                const monthYear = `${selection.month}/${selection.year}`;
                let stocksHtml = `<strong>${monthYear}:</strong><br>`;
                
                selection.stocks.forEach(stock => {
                    stocksHtml += `<span>${stock.symbol}: Return (${stock.return}%), Previous Month Return (${stock.previousReturn}%)</span><br>`;
                });

                const monthStocksDiv = document.createElement('div');
                monthStocksDiv.className = 'month-stocks';
                monthStocksDiv.innerHTML = stocksHtml;

                selectedStocksDiv.appendChild(monthStocksDiv);
            });

            resultsDiv.appendChild(selectedStocksDiv);
        });
});
