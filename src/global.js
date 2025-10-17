import { Link } from "react-router-dom";

export const BackgroundCovered = '#282c34';
export const BackgroundUncovered = 'white';
export const MessageColorCovered = 'white';
export const MessageColorUncovered = 'black';

export const HighlightColor = 'yellow';
export const LinkColor = '#61dafb';
export const TopbarColor = '#61dafb';

export const GlobalToolBar = () => {
    return (
        <div className = "global-toolbar">
            <Link to = "/EE4032">Login</Link>
            &nbsp;|&nbsp;
            <Link to = "/profile">Profile</Link>
            {/* &nbsp;|&nbsp;
            <Link to = "/storage">Storage</Link> */}
            &nbsp;|&nbsp;
            <Link to = "/history">History</Link>
            &nbsp;|&nbsp;
            <Link to = "/leader">Leader Election</Link>
        </div>
    )
}
