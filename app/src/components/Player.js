import React, { Component } from 'react';
import Img from 'react-image';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import ReactAudioPlayer from 'react-audio-player';
import Slider from 'rc-slider';
import { connect } from 'react-redux';
import moment from 'moment';
import 'moment-duration-format';

import fetch from '../util/fetch';

import nextIcon from '../images/player/next.svg';
import forwardIcon from '../images/player/forward.svg';
import rewindIcon from '../images/player/rewind.svg';
import pauseIcon from '../images/icons/pause.svg';
import playIcon from '../images/icons/play.svg';

class Player extends Component {
	constructor(props) {
		super(props);

		this.state = {
			playbackSpeed: 1,
			playing: false,
			progress: 0,
			volume: 0.5,
		};

		this.cyclePlaybackSpeed = this.cyclePlaybackSpeed.bind(this);
		this.setVolume = this.setVolume.bind(this);
		this.seekTo = this.seekTo.bind(this);
		this.playbackSpeedOptions = [1, 1.25, 1.5, 1.75, 2];
		this.lastSent = 0;
		this.togglePlayOrPause = this.togglePlayOrPause.bind(this);
		this.incomingMediaControls = this.incomingMediaControls.bind(this);
		this.outboundMediaControls = this.outboundMediaControls.bind(this);
	}

	componentDidMount() {
		this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

		if (this.props.episode) {
			this.audioPlayerElement.audioEl.volume = this.state.volume / 100;
		}
	}

	componentDidUpdate(prevProps) {
		if (!this.props.episode) {
			return;
		} else if (!prevProps.playing && this.props.playing) {
			if (!prevProps.episode) {
				// make a request to get the played progress
				fetch('GET', '/listens', null, { episode: this.props.episode._id }).then(
					response => {
						if (response.data.length !== 0) {
							this.setInitialPlaybackTime(response.data[0].duration).then(
								() => {
									this.audioPlayerElement.audioEl.play();
								},
							);
						} else {
							this.audioPlayerElement.audioEl.play();
						}
					},
				);
			} else {
				// just play (unpause)
				this.audioPlayerElement.audioEl.play();
			}
		} else if (prevProps.playing && !this.props.playing) {
			this.audioPlayerElement.audioEl.pause();
		} else if (this.props.episode._id !== prevProps.episode._id) {
			// check and get the latest listen data for the podcast - set the "duration" field
			fetch('GET', '/listens', null, { episode: this.props.episode._id }).then(
				response => {
					if (response.data.length !== 0) {
						this.setInitialPlaybackTime(response.data[0].duration).then(
							() => {
								this.audioPlayerElement.audioEl.play();
							},
						);
					} else {
						this.audioPlayerElement.audioEl.play();
					}
				},
			);
		}
	}

	togglePlayOrPause() {
		if (this.props.playing) {
			this.props.pause();

			this.outboundMediaControls({
				type: 'pause',
			});
		} else {
			this.props.play();

			this.outboundMediaControls({
				type: 'play',
			});
		}
	}

	skipAhead() {
		// get current position of audio
		let currentPlaybackPosition = this.audioPlayerElement.audioEl.currentTime;

		// fastseek to next position of audio
		this.audioPlayerElement.audioEl.currentTime = currentPlaybackPosition + 30;
		this.updateProgress(this.audioPlayerElement.audioEl.currentTime);
	}

	skipBack() {
		// get current position of audio
		let currentPlaybackPosition = this.audioPlayerElement.audioEl.currentTime;

		// fast seek to next position of audio
		this.audioPlayerElement.audioEl.currentTime = currentPlaybackPosition - 30;
		this.updateProgress(this.audioPlayerElement.audioEl.currentTime);
	}

	cyclePlaybackSpeed() {
		// only two hard problems in computer science, right?
		let nextSpeed = this.playbackSpeedOptions[
			(this.playbackSpeedOptions.indexOf(this.state.playbackSpeed) + 1) %
				this.playbackSpeedOptions.length
		];

		this.setState({
			playbackSpeed: nextSpeed,
		});

		this.audioPlayerElement.audioEl.playbackRate = nextSpeed;
	}

	setVolume(volume) {
		this.setState({
			volume,
		});
	}

	seekTo(progress) {
		this.audioPlayerElement.audioEl.currentTime =
			progress * this.audioPlayerElement.audioEl.duration;
		this.updateProgress(this.audioPlayerElement.audioEl.currentTime);
	}

	updateProgress(seconds) {
		let progress = (seconds / this.audioPlayerElement.audioEl.duration) * 100;
		this.setState({
			currentTime: seconds,
			duration: this.audioPlayerElement.audioEl.duration,
			progress,
		});
	}

	setInitialPlaybackTime(currentTime) {
		return new Promise(resolve => {
			this.audioPlayerElement.audioEl.currentTime = currentTime;
			this.setState(
				{
					currentTime,
				},
				() => {
					resolve();
				},
			);
		});
	}

	incomingMediaControls() {
		window.ipcRenderer.on('media-controls', (event, args) => {
			if (args === 'togglePlayPause') {
				this.togglePlayOrPause();
			} else if (args === 'next') {
				this.skipAhead();
			} else if (args === 'previous') {
				this.skipBack();
			}
		});
	}

	outboundMediaControls(args) {
		window.ipcRenderer.send('media-controls', args);
	}

	render() {
		if (!this.props.episode) {
			return null;
		}

		let playButton = (
			<div className="btn play" onClick={this.togglePlayOrPause}>
				<Img src={playIcon} />
			</div>
		);

		let pauseButton = (
			<div className="btn pause" onClick={this.togglePlayOrPause}>
				<Img src={pauseIcon} />
			</div>
		);

		let contextURL = '';
		if (this.props.context.contextType === 'playlist') {
			contextURL = `/playlists/${this.props.context.contextID}`;
		} else if (this.props.context.contextType === 'podcast') {
			contextURL = `/podcasts/${this.props.context.contextID}`;
		}

		return (
			<div className="player">
				<div className="left">
					<Img
						className="poster"
						height="40"
						src={this.props.episode.podcast.image}
						width="40"
					/>
					<div
						className="rewind"
						onClick={() => {
							this.skipBack();
						}}
					>
						<Img src={rewindIcon} />
					</div>
					{this.props.playing ? pauseButton : playButton}
					<div
						className="forward"
						onClick={() => {
							this.skipAhead();
						}}
					>
						<Img src={forwardIcon} />
					</div>
					<div className="speed" onClick={this.cyclePlaybackSpeed}>
						{this.state.playbackSpeed}x
					</div>
				</div>
				<div className="middle">
					<div
						className="progress-bar"
						style={{
							width: `${this.state.progress}%`,
						}}
					/>
					<div
						className="progress-bar-click-catcher"
						onClick={e => {
							this.seekTo(e.nativeEvent.offsetX / e.target.clientWidth);
						}}
					/>
					<div className="media">
						<div className="title">{this.props.episode.title}</div>
						<div className="info">
							<span className="episode">
								{this.props.episode.podcast.title}
							</span>
							<span className="date">
								{moment(this.props.episode.publicationDate).format(
									'MMM D YYYY',
								)}
							</span>
						</div>
					</div>
					<div className="sub-right">
						<div className="timestamps">
							{`${moment
								.duration(this.state.currentTime, 'seconds')
								.format('h:mm:ss', {
									stopTrim: 'mm',
								})} / ${moment
								.duration(this.state.duration, 'seconds')
								.format('h:mm:ss', {
									stopTrim: 'mm',
								})}`}
						</div>
					</div>
				</div>
				<div className="right">
					<Slider
						max={1}
						min={0}
						onChange={this.setVolume}
						step={0.1}
						value={this.state.volume}
					/>
					<Link className="next" to={contextURL}>
						<Img src={nextIcon} />
					</Link>
				</div>
				<ReactAudioPlayer
					listenInterval={500}
					onEnded={() => {
						this.setState({
							playing: false,
						});
						// dispatch event to switch to next podcast
						this.props.nextTrack();
					}}
					onListen={seconds => {
						this.updateProgress(seconds);

						// check last sent
						let currentTime = new Date().valueOf();
						if (currentTime - this.lastSent >= 15000) {
							// greater than 15s ago
							this.lastSent = currentTime;
							fetch('POST', '/listens', {
								duration: this.audioPlayerElement.audioEl.currentTime,
								episode: this.props.episode._id,
								user: this.props.currentUserID,
							});
						}
					}}
					ref={element => {
						this.audioPlayerElement = element;
					}}
					src={this.props.episode.enclosure}
					volume={this.state.volume}
				/>
			</div>
		);
	}
}

Player.propTypes = {
	episode: null,
	playing: false,
};

Player.propTypes = {
	context: PropTypes.shape({
		contextID: PropTypes.string,
		contextPosition: PropTypes.number,
		contextType: PropTypes.string,
		episodeID: PropTypes.string,
	}),
	currentUserID: PropTypes.string,
	episode: PropTypes.shape({
		_id: PropTypes.string,
		enclosure: PropTypes.string,
		podcast: PropTypes.shape({
			image: PropTypes.string,
			title: PropTypes.string,
		}),
		publicationDate: PropTypes.string,
		title: PropTypes.string,
	}),
	nextTrack: PropTypes.func.isRequired,
	pause: PropTypes.func.isRequired,
	play: PropTypes.func.isRequired,
	toggleLike: PropTypes.func,
};

const mapStateToProps = state => {
	if (!('player' in state)) {
		return { episode: null };
	}
	let episode = { ...state.episodes[state.player.episodeID] };
	// populate podcast parent too
	episode.podcast = { ...state.podcasts[episode.podcast] };
	let context = { ...state.player };
	let currentUserID = localStorage['authedUser'];
	return {
		context,
		currentUserID,
		episode,
		playing: context.playing,
	};
};

const mapDispatchToProps = dispatch => {
	return {
		nextTrack: () => {
			dispatch({ type: 'NEXT_TRACK' });
		},
		pause: () => {
			dispatch({ type: 'PAUSE_EPISODE' });
		},
		play: () => {
			dispatch({ type: 'RESUME_EPISODE' });
		},
		toggleLike: () => {
			dispatch({ type: 'TOGGLE_LIKE_ON_CURRENT_TRACK' });
		},
	};
};

export default connect(
	mapStateToProps,
	mapDispatchToProps,
)(Player);
