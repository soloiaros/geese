import { useState } from "react";

import GooseSoundButton from "./GooseSoundButton.jsx";
import Scene from "./Scene.jsx";


export default function GeeseCanvasContainer({ setGeesePositions }) {
    const [isMuted, setIsMuted] = useState(true);

    function onMuteClicked() {
        setIsMuted(!isMuted);
    }

    return (
        <>
            <Scene setGeesePositions={setGeesePositions} isMuted={isMuted} />
            <GooseSoundButton isMuted={isMuted} onClick={onMuteClicked} />
        </>
    )
}