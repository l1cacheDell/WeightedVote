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
            <Link to = "/">Login</Link>
            &nbsp;|&nbsp;
            <Link to = "/profile">Profile</Link>
            &nbsp;|&nbsp;
            <Link to = "/history">History</Link>
            &nbsp;|&nbsp;
            <Link to = "/employee/identity">Employee Identity</Link>
            &nbsp;|&nbsp;
            <Link to = "/employee/vote">Employee Vote</Link>
            &nbsp;|&nbsp;
            <Link to = "/hr/roster">HR Roster</Link>
            &nbsp;|&nbsp;
            <Link to = "/hr/tree">HR Build Tree</Link>
            &nbsp;|&nbsp;
            <Link to = "/hr/election">HR Election</Link>
            &nbsp;|&nbsp;
            <Link to = "/results">Results</Link>
        </div>
    )
}
