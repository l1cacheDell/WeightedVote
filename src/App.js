import {Routes, Route} from "react-router-dom";
import {useNavigate} from "react-router-dom";
import {useEffect, useState} from 'react';
import {ethers} from 'ethers';
// import Web3 from "web3";
import { openDb } from "./lib/db";

import './App.css';
import Login from "./components/login/login";
import Profile from "./components/profile/profile";
import Storage from "./components/storage/storage";
import History from "./components/history/history";
import Leader from "./components/leader/leader";
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "./contracts/config";
import { CONTRACT_ABI_2, CONTRACT_ADDRESS_2 } from "./contracts/config_2";

// import something from routes
import { Navigate } from "react-router-dom";
import Identity from "./routes/employee/Identity";
import Vote from "./routes/employee/Vote";
import Roster from "./routes/hr/Roster";
import Tree from "./routes/hr/Tree";
import Election from "./routes/hr/Election";
import Results from "./routes/Results";


export default function App() {
    const [haveMetamask, setHaveMetamask] = useState(true);     // check if the browser has MetaMask installed. 
    const [address, setAddress] = useState(null);               // address of connected MetaMask account. 
    const [network, setNetwork] = useState(null);               // network the account is using. 
    const [balance, setBalance] = useState(0);                  // balance of connected MetaMask account. 
    const [isConnected, setIsConnected] = useState(false);      // check if is connected to MetaMask account. 

    const [storedPending, setStoredPending] = useState(false);        // check if a value is pending. 
    const [storedDone, setStoredDone] = useState(false);        // check if a value is stored. 
    const [storedVal, setStoredVal] = useState(0);              // value that is stored right now. 
    const [showVal, setShowVal] = useState(0);                  // value that is showed on screen. 

    const [historyRecord, setHistoryRecord] = useState([]);   // record of history operations. 
    const [recordLen, setRecordLen] = useState(0);              // length of record. 
    const maxRecordLen = 50;                                    // maximum length of record list.                        

    const [commitPending, setCommitPending] = useState(false);
    const [commitDone, setCommitDone] = useState(false);
    const [revealPending, setRevealPending] = useState(false);
    const [revealAccepted, setRevealAccepted] = useState(false);
    const [resetDone, setResetDone] = useState(false);
    const [showLead, setShowLead] = useState("0x0000000000000000000000000000000000000000");
    const [electionOn, setElectionOn] = useState(false);
    const [revealOn, setRevealOn] =useState(false);
    const [elected, setElected] = useState(false)

    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [contractRead, setContractRead] = useState(null);
    const [contractWrite, setContractWrite] = useState(null);
    const [contract2Read, setContract2Read] = useState(null);
    const [contract2Write, setContract2Write] = useState(null);

    
    const navigate = useNavigate();

    const getNetworkLabel = (chainId) => {
        switch (chainId) {
            case 1:
                return "Ethereum Mainnet";
            case 3:
                return "Ropsten Test Network";
            case 4:
                return "Rinkeby Test Network";
            case 5:
                return "Goerli Test Network";
            case 42:
                return "Kovan Test Network";
            case 11155111:
                return "Sepolia Test Network";
            default:
                return `Chain ${chainId}`;
        }
    };

    useEffect(() => {
        (async () => {
            await openDb(); // ← 第一次跑到这里会：新建空库 -> 执行建表SQL -> 保存到 IndexedDB
            console.log("DB ready");
        })();

        if (!window.ethereum) {
            return;
        }

        const baseProvider = new ethers.providers.Web3Provider(window.ethereum, "any");
        setProvider(baseProvider);

        // 只读实例（不用账户也能读）
        setContractRead(new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, baseProvider));
        setContract2Read(new ethers.Contract(CONTRACT_ADDRESS_2, CONTRACT_ABI_2, baseProvider));

        const handleChainChanged = () => {
            setNetwork(null);
            setIsConnected(false);
            setAddress(null);
            setBalance(0);
            setHistoryRecord([]);
            setRecordLen(0);
            navigate("/");
        };

        const handleAccountsChanged = async (accounts) => {
            if (!accounts || accounts.length === 0) {
                handleChainChanged();
                return;
            }
            const nextAddress = ethers.utils.getAddress(accounts[0]);
            setAddress(nextAddress);
            setIsConnected(true);

            try {
                const { chainId } = await baseProvider.getNetwork();
                setNetwork(getNetworkLabel(chainId));
                const balanceWei = await baseProvider.getBalance(nextAddress);
                setBalance(ethers.utils.formatEther(balanceWei));
                setHistoryRecord([]);
                setRecordLen(0);
                fetchRecentTransactions(nextAddress, baseProvider);
                navigate("/profile");
            } catch (err) {
                console.error("Failed to refresh account details", err);
            }
        };

        window.ethereum.on?.("chainChanged", handleChainChanged);
        window.ethereum.on?.("accountsChanged", handleAccountsChanged);

        return () => {
            window.ethereum?.removeListener("chainChanged", handleChainChanged);
            window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
        };
    }, [navigate]);


    // useEffect(() => {
    //     const { ethereum } = window;
    //     const checkMetamaskAvailability = async () => {
    //         if (!ethereum) {
    //             setHaveMetamask(false);
    //         }
    //         setHaveMetamask(true);
    //     };
    //     checkMetamaskAvailability();
    // }, []);

////// connect to MetaMask. 
    const connectWallet = async () => {
        try {
            const activeProvider = provider ?? new ethers.providers.Web3Provider(window.ethereum, "any");
            if (!provider) {
                setProvider(activeProvider);
                setContractRead(new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, activeProvider));
                setContract2Read(new ethers.Contract(CONTRACT_ADDRESS_2, CONTRACT_ABI_2, activeProvider));
            }

            await activeProvider.send("eth_requestAccounts", []);
            const s = activeProvider.getSigner();
            setSigner(s);

            const addr = await s.getAddress();
            const { chainId } = await activeProvider.getNetwork();
            const bal = ethers.utils.formatEther(await activeProvider.getBalance(addr));

            // 你的 UI 状态
            setAddress(addr);
            setBalance(bal);
            setIsConnected(true);
            setNetwork(getNetworkLabel(chainId));

            setHistoryRecord([]);
            setRecordLen(0);
            fetchRecentTransactions(addr, activeProvider);

            // 生成“可写合约”实例（带 signer）
            // setContractWrite(new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, s));
            // setContract2Write(new ethers.Contract(CONTRACT_ADDRESS_2, CONTRACT_ABI_2, s));

            navigate("/profile");
        } catch (e) {
            console.error(e);
            setIsConnected(false);
        }
    };

    // const connectWallet = async () => {         // function that connect to METAMASK account, activated when clicking on 'connect'. 
    //     try {
    //         if (!ethereum){
    //             setHaveMetamask(false);
    //         }
    //         const accounts = await ethereum.request({
    //             method: 'eth_requestAccounts',
    //         });
    //         const chainId = await ethereum.request({
    //             method: 'eth_chainId',
    //         });

    //         let balanceVal = await provider.getBalance(accounts[0]);
    //         let bal = ethers.utils.formatEther(balanceVal);

    //         console.log(chainId);
    //         if (chainId === '0x3'){
    //             setNetwork('Ropsten Test Network');
    //         }
    //         else if (chainId === '0x5'){
    //             setNetwork('Goerli Test Network');
    //         }
    //         else if (chainId === '0xaa36a7'){
    //             setNetwork('Sepolia Test Network');
    //         }
    //         else {
    //             setNetwork('Other Test Network');
    //         }
    //         setAddress(accounts[0]);
    //         setBalance(bal);
    //         setIsConnected(true);

    //         navigate("/profile");
    //     }
    //     catch (error){
    //         setIsConnected(false);
    //     }
    // }

    
////// history recording. 
    const RecordPush = (opr, val, detail = {}) => {
        const { gasUsed, status: detailStatus, address: recordAddressOverride, timestamp, txHash } = detail || {};
        let stat = 1;
        let cost = 0;
        let recordValue = val;
        let recordAddressLocal = recordAddressOverride || address;

        if (!recordValue || (typeof recordValue === 'string' && recordValue.length === 0)){
            recordValue = 'NA';
            cost = 'NA';
            stat = detailStatus ?? 0;
        }
        else if (opr === 'get'){
            cost = 0;
            stat = 1;
        }
        else if (detail === 'null'){
            setStoredPending(false);
            setStoredDone(true);
            cost = 'NA';
            stat = 2;
        }
        else{
            if (gasUsed){
                cost = gasUsed;
            }
            else if (detail && detail.gasUsed){
                cost = detail.gasUsed;
            }
            else{
                cost = 'NA';
            }

            if (detailStatus !== undefined && detailStatus !== null){
                if (detailStatus === 0){
                    stat = 0;
                }
                else if (detailStatus === 2){
                    stat = 2;
                }
                else{
                    stat = detailStatus;
                }
            }
        }

        setHistoryRecord((currentRecords = []) => {
            const lastId = currentRecords.length > 0 ? currentRecords[currentRecords.length - 1].id : 0;
            const newRecord = {
                id: lastId + 1,
                address: recordAddressLocal,
                operation: opr,
                value: recordValue,
                cost: cost,
                status: stat,
                timestamp: timestamp ?? null,
                txHash: txHash ?? null
            };
            const updatedRecords = [...currentRecords, newRecord];
            const trimmedRecords = updatedRecords.length > maxRecordLen
                ? updatedRecords.slice(updatedRecords.length - maxRecordLen)
                : updatedRecords;
            setRecordLen(trimmedRecords.length);
            return trimmedRecords;
        });
    }

    const ETHERSCAN_V2_ENDPOINT = "https://api.etherscan.io/v2/api";

    const fetchHistoryFromEtherscanV2 = async (chainId, account, apiKey) => {
        const params = new URLSearchParams({
            chainid: String(chainId),
            module: "account",
            action: "txlist",
            address: account,
            startblock: "0",
            endblock: "99999999",
            sort: "asc"
        });
        if (apiKey && apiKey.length > 0) {
            params.append("apikey", apiKey);
        }

        const response = await fetch(`${ETHERSCAN_V2_ENDPOINT}?${params.toString()}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const payload = await response.json();
        if (payload.status === "0") {
            if (payload.message === "No transactions found") {
                return [];
            }
            throw new Error(payload.result || payload.message || "Unknown Etherscan error");
        }
        if (!Array.isArray(payload.result)) {
            throw new Error("Unexpected Etherscan response format");
        }
        return payload.result.map(tx => ({
            hash: tx.hash,
            from: tx.from,
            to: tx.to,
            value: tx.value,
            timestamp: tx.timeStamp ? Number(tx.timeStamp) : null,
            gasUsed: tx.gasUsed,
            status: tx.txreceipt_status === "0" || tx.isError === "1" ? 2 : 1
        }));
    };

    const fetchRecentTransactions = async (account, providerInstance) => {
        if (!account || !providerInstance) {
            return;
        }
        try {
            const nowSec = Math.floor(Date.now() / 1000);
            const oneYearSec = 365 * 24 * 60 * 60;
            const cutoff = nowSec - oneYearSec;

            const network = await providerInstance.getNetwork();
            const apiKey = process.env.REACT_APP_ETHERSCAN_API_KEY;

            let historyTx = [];
            try {
                historyTx = await fetchHistoryFromEtherscanV2(network.chainId, account, apiKey);
            } catch (etherscanErr) {
                console.error("Failed to load history via Etherscan V2", etherscanErr);
                if (typeof providerInstance.getHistory === "function") {
                    try {
                        const fallbackHistory = await providerInstance.getHistory(account);
                        historyTx = fallbackHistory.map(tx => ({
                            hash: tx.hash,
                            from: tx.from,
                            to: tx.to,
                            value: tx.value,
                            timestamp: tx.timestamp ?? null,
                            gasUsed: tx.gasUsed ? tx.gasUsed.toString() : null,
                            status: tx.confirmations === 0 ? 0 : 1
                        }));
                    } catch (fallbackErr) {
                        console.error("Failed to load history via RPC provider", fallbackErr);
                        return;
                    }
                } else {
                    return;
                }
            }

            if (!historyTx || historyTx.length === 0) {
                return;
            }

            const filtered = historyTx.filter(tx => (tx.timestamp ?? 0) >= cutoff);
            if (filtered.length === 0) {
                return;
            }

            const recent = filtered
                .slice(-10)
                .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
            const accountLower = account.toLowerCase();

            for (const tx of recent) {
                const valueEth = ethers.utils.formatEther(tx.value || 0);
                const isOutgoing = tx.from?.toLowerCase() === accountLower;
                const directionSign = isOutgoing ? '-' : '+';
                const formattedValue = `${directionSign}${valueEth} ETH`;
                const gasUsedRaw = tx.gasUsed ?? null;
                const gasUsed = gasUsedRaw
                    ? (typeof gasUsedRaw === 'string' ? gasUsedRaw : gasUsedRaw.toString())
                    : null;
                const status = tx.status ?? 1;
                const relatedAddress = isOutgoing ? (tx.to ?? account) : (tx.from ?? account);

                RecordPush(
                    'transaction',
                    formattedValue,
                    {
                        gasUsed,
                        status,
                        address: relatedAddress,
                        timestamp: tx.timestamp,
                        txHash: tx.hash
                    }
                );
            }
        } catch (error) {
            console.error('Failed to load recent transactions', error);
        }
    }


////// display functions. 
    const ProfileDisplay = () => {
        return (
            <Profile 
                isConnected = {isConnected}
                address = {address} 
                networkType = {network} 
                balance = {balance}
            />
        )
    }

    const HistoryDisplay = () => {
        return (
            <History 
                isConnected = {isConnected}
                recordList = {historyRecord}
                recordLen = {recordLen}
            />
        )
    }

    return (
        // <BrowserRouter>
            <div className="App">
                <Routes>
                    <Route path = "/" element = {<Login isHaveMetamask = {haveMetamask} connectTo = {connectWallet} />}></Route>
                    <Route path = "/profile" element = {<ProfileDisplay/>}></Route>
                    {/* <Route path = "/storage" element = {<StorageDisplay/>}></Route> */}
                    <Route path = "/history" element = {<HistoryDisplay/>}></Route>

                    <Route path="/employee/identity" element={<Identity />} />
                    <Route path="/employee/vote" element={<Vote />} />
                    <Route path="/hr/roster" element={<Roster />} />
                    <Route path="/hr/tree" element={<Tree />} />
                    <Route path="/hr/election" element={<Election />} />
                    <Route path="/results" element={<Results />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
        // </BrowserRouter>
    );
}
