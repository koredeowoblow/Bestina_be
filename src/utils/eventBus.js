import EventEmitter from 'events';
import AppError from './AppError.js';

class EventBus extends EventEmitter {}

const eventBus = new EventBus();

// General error capturing for the bus
eventBus.on('error', (err) => {
  console.error('EventBus Error:', err);
});

export default eventBus;
