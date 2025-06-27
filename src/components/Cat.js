import React from 'react';
import './Cat.css';

const Cat = () => {
  return (
    <div className="cat-container">
      <img 
        src="/cat.jpg" 
        alt="Meow" 
        className="cat-image"
      />
      <h1>Meow!</h1>
      <p>Welcome to the Meow website</p>
    </div>
  );
};

export default Cat;
