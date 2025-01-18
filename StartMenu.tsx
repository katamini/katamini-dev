import React from "react";
import { levels } from "./levels";

interface StartMenuProps {
  onSelectLevel: (levelId: string) => void;
}

const StartMenu: React.FC<StartMenuProps> = ({ onSelectLevel }) => {
  return (
    <div className="start-menu">
      <h1 className="text-3xl font-bold mb-4">Select a Level</h1>
      <ul>
        {levels.map(level => (
          <li key={level.id}>
            <button onClick={() => onSelectLevel(level.id)}>
              {level.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default StartMenu;
