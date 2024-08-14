import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [numTopStocks, setNumTopStocks] = useState(5);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [frequency, setFrequency] = useState('monthly');

  const handleLoadData = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }
    if (numTopStocks < 1 || numTopStocks > 20) {
      setError('Please enter a valid number of top stocks between 1 and 20');
      return;
    }
    setError('');

    const [startYear, startMonth] = startDate.split('-');
    const [endYear, endMonth] = endDate.split('-');

    const stocks = [
      'ADANI_ENTERPRISES.json', 'ADANI_PORTS.json', 'APOLLO_HOSPITALS.json', 'ASIAN_PAINTS.json', 'AXIS_BANK.json',
      'BAJAJ_AUTO.json', 'BAJAJ_FINANCE.json', 'BAJAJ_FINSERV.json', 'BHARAT_PETROLEUM.json', 'BHARTI_AIRTEL.json',
      'BRITANNIA.json', 'CIPLA.json', 'COAL_INDIA.json', 'DIVIS_LAB.json', 'EICHER_MOTORS.json', 'GRASIM.json',
      'HCL_TECHNOLOGIES.json', 'HDFC_BANK.json', 'HDFC_LIFE.json', 'HERO_MOTOCORP.json', 'HINDALCO.json',
      'HINDUSTAN_UNILEVER.json', 'ICICI_BANK.json', 'INDUSINDBK.json', 'INFOSYS.json', 'ITC.json', 'JSW_STEEL.json',
      'KOTAK_MAHINDRA.json', 'MARUTI_SUZUKI.json', 'NESTLE.json', 'NTPC.json', 'ONGC.json', 'POWERGRID.json',
      'RELIANCE.json', 'SBI_BANK.json', 'SBI_LIFE.json', 'SUN_PHARMA.json', 'TATA_CONSULTANCY_SERVICES.json',
      'TATA_CONSUMER_PRODUCTS.json', 'TATA_MOTORS.json', 'TATA_STEEL.json', 'TECH_MAHINDRA.json', 'TITAN.json',
      'ULTRATECH_CEMENT.json', 'WIPRO.json'
    ];

    try {
      const stockDataPromises = stocks.map(stock => axios.get(`dataset/${stock}`));
      const nifty50Promise = axios.get('dataset/nifty50/NIFTY50.json');

      const responses = await Promise.all([...stockDataPromises, nifty50Promise]);
      const stockData = responses.slice(0, -1).map(res => res.data);
      const nifty50Data = responses[responses.length - 1].data;

      const niftyDataInRange = nifty50Data.filter(item => {
        //console.log(item.Date);
        const itemDate = parseDate(item.Date);
        // console.log(itemDate);

        return itemDate >= new Date(startYear, startMonth - 1, 1) && itemDate <= new Date(endYear, endMonth, 0);
      });

      const niftyStartPrice = niftyDataInRange[0].Open;
      const niftyEndPrice = niftyDataInRange[niftyDataInRange.length - 1].Close;
      const totalCumulativeReturnNifty50 = ((niftyEndPrice - niftyStartPrice) / niftyStartPrice) * 100;
      // console.log(niftyStartPrice);
      // console.log(niftyEndPrice);

      let cumulativeReturnTopStocks = 1;
      let selectedStocks = [];

      const incrementBy = (frequency === 'monthly' ? 1 : frequency === 'quarterly' ? 3 : frequency === 'semiannual' ? 6 : 12);
      const prevIncrementBy = (incrementBy + 1);
      // console.log(startMonth);
      // console.log(parseInt(startMonth));

      for (let currentYear = startYear; currentYear <= endYear; currentYear++) {
        for (let currentMonth = (currentYear === startYear ? parseInt(startMonth) : 1);
             currentMonth <= (currentYear === endYear ? parseInt(endMonth) : 12); currentMonth += incrementBy) {

          const monthStartDate = new Date(currentYear, currentMonth - 1, 1);
          const monthEndDate = new Date(currentYear, currentMonth + incrementBy - 1, 0);

          const previousMonthStartDate = new Date(currentYear, currentMonth - prevIncrementBy, 1);
          const previousMonthEndDate = new Date(currentYear, currentMonth - 1, 0);
          // console.log(monthStartDate);
          // console.log(monthEndDate);
          // console.log(previousMonthStartDate);
          // console.log(previousMonthEndDate);

          const stockReturns = stockData.map((stock, index) => {
            const previousMonthData = stock.filter(item => {
              const itemDate = parseDate(item.Date);
              return itemDate >= previousMonthStartDate && itemDate <= previousMonthEndDate;
            });

            const monthlyData = stock.filter(item => {
              const itemDate = parseDate(item.Date);
              return itemDate >= monthStartDate && itemDate <= monthEndDate;
            });

            if (monthlyData.length < 2) return { symbol: stocks[index].replace('.json', ''), return: 0, previousReturn: 0 };

            const startPrice = monthlyData[0].Open;
            const endPrice = monthlyData[monthlyData.length - 1].Close;
            const stockReturn = ((endPrice - startPrice) / startPrice) * 100;

            let previousReturn = 0;
            if (previousMonthData.length >= 2) {
              const previousStartPrice = previousMonthData[0].Open;
              const previousEndPrice = previousMonthData[previousMonthData.length - 1].Close;
              previousReturn = ((previousEndPrice - previousStartPrice) / previousStartPrice) * 100;
            }


            return { symbol: stocks[index].replace('.json', ''), return: stockReturn, previousReturn: previousReturn };
          });

          stockReturns.sort((a, b) => b.previousReturn - a.previousReturn);
          const topStocks = stockReturns.slice(0, numTopStocks);

          const avgReturnTopStocks = topStocks.reduce((acc, stock) => acc + stock.return, 0) / topStocks.length;

          

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
      const totalCumulativeReturnTopStocks = (cumulativeReturnTopStocks - 1) * 100;

      setResults({
        totalCumulativeReturnNifty50,
        totalCumulativeReturnTopStocks,
        selectedStocks,
      });
    } catch (error) {
      setError('Error loading data');
    }
  };

  const parseDate = dateStr => {
    const [day, month, year] = dateStr.split('-');
    return new Date(year, month - 1, day);
  };

  return (
    <div className="container">
      <h1>Nifty 50 Stock Performance Comparison</h1>
      {error && <div className="alert">{error}</div>}
      <div className="form">
        <div className="form-group">
          <label>Start Date</label>
          <input
            type="month"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            min="2011-07"
            max="2023-05"
          />
        </div>
        <div className="form-group">
          <label>End Date</label>
          <input
            type="month"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min="2011-07"
            max="2023-05"
          />
        </div>
        <div className="form-group">
          <label>Number of Top Stocks</label>
          <input
            type="number"
            value={numTopStocks}
            onChange={(e) => setNumTopStocks(Number(e.target.value))}
          />
        </div>
        <div className="form-group">
          <label>Frequency</label>
          <select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="semiannual">Semiannual</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
        <button className="load-button" onClick={handleLoadData}>Load Data</button>
      </div>
      {results && (
        <div className="results">
          <h2>Cumulative Return for Nifty 50: {results.totalCumulativeReturnNifty50.toFixed(2)}%</h2>
          <h2>Cumulative Return for Top Stocks: {results.totalCumulativeReturnTopStocks.toFixed(2)}%</h2>
          <h3>Selected Stocks:</h3>
          <table className="results-table">
            <thead>
              <tr>
                <th>Year</th>
                <th>Month</th>
                <th>Stock Symbol</th>
                <th>Return (%)</th>
                <th>Previous Return (%)</th>
              </tr>
            </thead>
            <tbody>
            {results.selectedStocks.map((item, index) =>
                item.stocks.map(stock => (
                  <tr key={stock.symbol}>
                    <td>{item.year}</td>
                    <td>{item.month}</td>
                    <td>{stock.symbol}</td>
                    <td>{stock.return}</td>
                    <td>{stock.previousReturn}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default App;
