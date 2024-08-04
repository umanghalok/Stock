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

    const stocks = [
        "ADANI_ENTERPRISES.json", "ADANI_PORTS.json", "APOLLO_HOSPITALS.json", "ASIAN_PAINTS.json", "AXIS_BANK.json",
        "BAJAJ_AUTO.json", "BAJAJ_FINANCE.json", "BAJAJ_FINSERV.json", "BHARAT_PETROLEUM.json", "BHARTI_AIRTEL.json",
        "BRITANNIA.json", "CIPLA.json", "COAL_INDIA.json", "DIVIS_LAB.json", "EICHER_MOTORS.json", "GRASIM.json",
        "HCL_TECHNOLOGIES.json", "HDFC_BANK.json", "HDFC_LIFE.json", "HERO_MOTOCORP.json", "HINDALCO.json",
        "HINDUSTAN_UNILEVER.json", "ICICI_BANK.json", "INDUSINDBK.json", "INFOSYS.json", "ITC.json", "JSW_STEEL.json",
        "KOTAK_MAHINDRA.json", "MARUTI_SUZUKI.json", "NESTLE.json", "NTPC.json", "ONGC.json", "POWERGRID.json",
        "RELIANCE.json", "SBI_BANK.json", "SBI_LIFE.json", "SUN_PHARMA.json", "TATA_CONSULTANCY_SERVICES.json",
        "TATA_CONSUMER_PRODUCTS.json", "TATA_MOTORS.json", "TATA_STEEL.json", "TECH_MAHINDRA.json", "TITAN.json",
        "ULTRATECH_CEMENT.json", "WIPRO.json"
    ];

    Promise.all([
        ...stocks.map(stock => fetch(`dataset/${stock}`).then(response => response.json())),
        fetch(`dataset/nifty50/NIFTY50.json`).then(response => response.json())
    ])
    .then(data => {
        const nifty50Data = data.pop();
        let cumulativeReturnNifty50 = 1;
        let cumulativeReturnTopStocks = 1;
        let selectedStocks = [];
        let niftyStartPrice = '';
        let niftyEndPrice = '';
        for (let currentYear = parseInt(startYear); currentYear <= parseInt(endYear); currentYear++) {
            for (let currentMonth = (currentYear === parseInt(startYear) ? parseInt(startMonth) : 1); currentMonth <= (currentYear === parseInt(endYear) ? parseInt(endMonth) : 12); currentMonth++) {
                const monthStartDate = new Date(currentYear, currentMonth - 1, 1);
                const monthEndDate = new Date(currentYear, currentMonth, 0);

                const previousMonthStartDate = new Date(currentYear, currentMonth - 2, 1);
                const previousMonthEndDate = new Date(currentYear, currentMonth - 1, 0);

                const stockReturns = data.map((stockData, index) => {
                    const previousMonthData = stockData.filter(item => {
                        const itemDate = parseDate(item.Date);
                        return itemDate >= previousMonthStartDate && itemDate <= previousMonthEndDate;
                    });

                    const monthlyData = stockData.filter(item => {
                        const itemDate = parseDate(item.Date);
                        return itemDate >= monthStartDate && itemDate <= monthEndDate;
                    });

                    if (monthlyData.length < 2) return { symbol: stocks[index].replace('.json', ''), return: -Infinity, previousReturn: -Infinity };

                    const startPrice = monthlyData[0].Close;
                    const endPrice = monthlyData[monthlyData.length - 1].Close;
                    const stockReturn = ((endPrice - startPrice) / startPrice) * 100;

                    let previousReturn = -Infinity;
                    if (previousMonthData.length >= 2) {
                        const previousStartPrice = previousMonthData[0].Close;
                        const previousEndPrice = previousMonthData[previousMonthData.length - 1].Close;
                        previousReturn = ((previousEndPrice - previousStartPrice) / previousStartPrice) * 100;
                    }

                    return { symbol: stocks[index].replace('.json', ''), return: stockReturn, previousReturn: previousReturn };
                });

                stockReturns.sort((a, b) => b.previousReturn - a.previousReturn);
                const topStocks = stockReturns.slice(0, numTopStocks);

                const avgReturnTopStocks = topStocks.reduce((acc, stock) => acc + stock.return, 0) / topStocks.length;

                const niftyMonthData = nifty50Data.filter(item => {
                    const itemDate = parseDate(item.Date);
                    return itemDate >= monthStartDate && itemDate <= monthEndDate;
                });

                if (niftyMonthData.length < 2) {
                    alert('Insufficient Nifty 50 data for the selected range.');
                    return;
                }

                if(niftyStartPrice==='') niftyStartPrice= niftyMonthData[0].Close;
                niftyEndPrice = niftyMonthData[niftyMonthData.length - 1].Close;
                cumulativeReturnTopStocks *= (1 + avgReturnTopStocks / 100);

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

        const totalCumulativeReturnNifty50 =((niftyEndPrice - niftyStartPrice) / niftyStartPrice) * 100;
        const totalCumulativeReturnTopStocks = (cumulativeReturnTopStocks - 1) * 100;

        const resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML = `
            <div class="stock-item">Cumulative Return for Nifty 50: ${totalCumulativeReturnNifty50.toFixed(2)}%</div>
            <div class="stock-item">Cumulative Return for Top ${numTopStocks} Stocks: ${totalCumulativeReturnTopStocks.toFixed(2)}%</div>
        `;

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

function parseDate(dateStr) {
    const [day, month, year] = dateStr.split('-');
    return new Date(year, month - 1, day);
}