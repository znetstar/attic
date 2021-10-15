import {PureComponent} from "react";
import styles from "./../../styles/timer.module.css";

type TimerProps = {
  date: string|Date|undefined;
}

type TimerState = {
  countDown: [number, number,number];
}

export class Timer extends PureComponent<TimerProps, TimerState> {
  constructor(props: TimerProps) {
    super(props);
  }

  state = {
    countDown: [0,0,0],
  } as TimerState

  timeDiff = (date:string) => {
    let currTime = new Date()
    let launchTime = new Date(date)
    let currSec = currTime.getTime()
    let launchSec = launchTime.getTime()
    let deltaSec = Math.floor((launchSec-currSec)/1000)
    let hr = Math.floor(deltaSec/3600)
    let min = Math.floor(deltaSec/60)
    let sec = deltaSec - (hr*3600 + min*60)
    if(hr <= 0) {
      hr = 0
    }
    if (min <= 0) {
      min = 0
    }
    if (sec <= 0) {
      sec = 0
    }
    if (deltaSec <= 0) {
      hr = min = sec = 0
      if (this.intervalId) {
        clearInterval(this.intervalId)
      }
    }
    this.setState({countDown: [hr, min, sec]})
  }

  intervalId:any = {}

  timeCounter = () => {
      this.intervalId = setInterval(() => {this.timeDiff(this.props.date)}, 1000)
  }

  componentDidMount() {
    if (this.props.date) {
      this.timeCounter()
    }
  }

  componentWillUnmount() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
    }
  }

  render() {
    console.log(this.state)
    let hr = this.state.countDown[0]    
    let min = this.state.countDown[1]
    let sec = this.state.countDown[2]    
    return (
      <div className={styles.timer_wrapper}>{(hr || min || sec) ? `${hr}hr ${min}m ${sec}s` : 'Auction Ended'}</div>
    )
  }
}

export default Timer;
