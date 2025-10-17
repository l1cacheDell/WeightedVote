import { Navigate } from "react-router-dom";

import "./history.css";
import "../../global.css";
import { GlobalToolBar } from "../../global";

export default function History(props){
    const displayNum = 10;

    const Menu = () => {
        return (
            <div className = "history-menu">
                <div className = "history-listNumber">#</div>
                <div className = "history-listAccount">Account</div>
                <div className = "history-listOperation">Operation</div>
                <div className = "history-listValue">Value</div>
                <div className = "history-listCost">Gas used (units)</div>
                <div className = "history-listMenuStatus">Status</div>
            </div>
        )
    }

    // const ListElement = (content) => {
    //     // const curRecord = props.recordList[itr];

    //     return (
    //         '<div className = "history-menu">'
    //             + '<div className = "history-listNumber">' + content.id + '</div>'
    //             + '<div className = "history-listAccount">' + content.address + '</div>'
    //             + '<div className = "history-listOperation">' + content.operation + '</div>'
    //             + '<div className = "history-listValue">' + content.value + '</div>'
    //             + '<div className = "history-listCost">' + content.cost + '</div>'
    //             + '<div className = "history-listStatus">'
    //                 + '<img src = {TrashIcon} alt = "delete" width = "30%"/>'
    //             + '</div>'
    //         + '</div>'
    //     )
    // }


    const RecordStatusDisplay = (propsStatus) => {
        const curRecord = propsStatus.record;

        if (curRecord.status === 1){
            return (
                <div className = "history-approved">A</div>
            );
        }
        else{
            if (curRecord.status === 0){
                return (
                    <div className = "history-invalid">I</div>
                );
            }
            else{
                return (
                    <div className = "history-rejected">R</div>
                );
            }
        }
    }

    const RecordDisplay = (propsDisplay) => {
        const curRecord = propsDisplay.record;
        // const recordNum = props.recordLen - curRecord.id;
        return (
            <div className = "history-elementInner">
                <div className = "history-listNumber">{curRecord.id ?? "-"}</div>
                <div className = "history-listAccount">{curRecord.address}</div>
                <div className = "history-listOperation">{curRecord.operation}</div>
                <div className = "history-listValue">{curRecord.value}</div>
                <div className = "history-listCost">{curRecord.cost}</div>
                <div className = "history-listStatus">
                    <RecordStatusDisplay record = {curRecord}/>
                </div>
            </div>
        )
    }

    const HistoryPage = () => {
        const records = props.recordList ?? [];
        const limitedRecords = records.slice(-displayNum);
        const placeholders = Math.max(displayNum - limitedRecords.length, 0);

        return (
            <div className = "history-background">
                <div className = "history">
                    <h1>History of Operations</h1>
                    <div className = "history-menuFramework">
                        <hr color = "black" width = "100%"/>
                        <Menu />
                        <hr color = "black" width = "100%"/>

                        {
                            limitedRecords.map((record, idx) => (
                                <div className = "history-element" key = {`record-${record.txHash ?? record.id ?? idx}`}>
                                    <RecordDisplay record = {record}/>
                                </div>
                            ))
                        }
                        {
                            Array.from({length: placeholders}).map((_, idx) => (
                                <div className = "history-element" key = {`placeholder-${idx}`}></div>
                            ))
                        }
                    </div>
                </div>
    
                <GlobalToolBar/>
            </div>
        )
    }

    return (
        <div>
            {
                props.isConnected ?
                <HistoryPage />:
                <Navigate to = '/' />
            }
        </div>
    )
}
