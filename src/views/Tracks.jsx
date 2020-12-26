import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { withRouter } from 'react-router-dom';
import { useStoreValue } from 'react-context-hook';

import SearchBar from '../components/SearchBar';
import SelectionList from '../components/SelectionList';
import NavigationBar from '../components/NavigationBar';
import { checkForToken, paramsToArray } from '../lib/helper';
import { FloatingButton } from '../components/RoundButton';
import { getTokenHeader } from '../lib/authorization';

const Tracks = (props) => {
  const playlistName = useStoreValue('playlistName');
  const [tracks, setTracks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    checkForToken(props.history);
    const paramArtists = paramsToArray('artists');
    let artist;
    for (artist of paramArtists) {
      getTopTracks(artist);
    }
  }, []);

  const getTopTracks = (artistId) => {
    if (artistId !== '') {
      axios
        .get(`	https://api.spotify.com/v1/artists/${artistId}/top-tracks`, {
          params: {
            market: 'DE',
          },
          ...getTokenHeader(),
        })
        .then(async (res) => {
          const tracksPerArtist = await localStorage.getItem('tracksPerArtist');
          const resTracks = formatTracks(
            res.data.tracks.slice(0, tracksPerArtist)
          );
          console.log(resTracks);
          resTracks.forEach((newTrack) => {
            if (!tracks.map((track) => track.id).includes(newTrack.id)) {
              setTracks((prev) => {
                return [...prev, newTrack];
              });
            }
          });
        })
        .catch((error) => {
          console.log(error);
        });
    }
  };

  const addTrack = (trackName) => {
    if (trackName !== '') {
      axios
        .get('https://api.spotify.com/v1/search', {
          params: {
            q: trackName,
            type: 'track',
            offset: 0,
            limit: 1,
          },
          ...getTokenHeader(),
        })
        .then((res) => {
          const searchedTrack = formatTracks(res.data?.tracks?.items);
          if (
            searchedTrack.length > 0 &&
            !tracks.map((track) => track.id).includes(searchedTrack[0].id)
          ) {
            setTracks((prev) => {
              return [searchedTrack[0], ...prev];
            });
          }
        })
        .catch((error) => {
          console.log(error);
        });
    }
  };

  const addTracksToPlaylist = async () => {
    const playlist = await createPlaylist();
    console.log(playlist);
    axios
      .post(
        `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
        {
          uris: tracks
            .filter((track) => track.selected)
            .map((track) => track.uri),
        },
        {
          ...getTokenHeader(),
        }
      )
      .then((res) => {
        console.log(res);
      })
      .catch((error) => {
        console.log(error);
      });
  };

  const createPlaylist = async () => {
    const user = await getSpotifyUser();
    return axios
      .post(
        `	https://api.spotify.com/v1/users/${user.id}/playlists`,
        {
          name: playlistName,
          public: false,
        },
        {
          ...getTokenHeader(),
        }
      )
      .then((res) => {
        return res.data;
      })
      .catch((error) => {
        console.log(error);
      });
  };

  const getSpotifyUser = () => {
    return axios
      .get('https://api.spotify.com/v1/me', {
        ...getTokenHeader(),
      })
      .then((res) => res.data)
      .catch((error) => {
        console.log(error);
      });
  };

  const formatTracks = (unformatedTracks) => {
    return unformatedTracks.map((track) => ({
      artists: track.artists.map((artist) => ({
        id: artist.id,
        name: artist.name,
      })),
      id: track.id,
      name: track.name,
      uri: track.uri,
      images: track?.album?.images,
      selected: true,
    }));
  };

  const toggleTrackSelection = (entry) => {
    let selectedTrack = entry;
    selectedTrack.selected = !selectedTrack.selected;
    const index = tracks.findIndex((track) => track.id === selectedTrack.id);
    let updatedTracks = [...tracks];
    updatedTracks[index] = selectedTrack;
    setTracks(updatedTracks);
  };
  return (
    <div>
      <NavigationBar title={'Tracks'} />
      <SearchBar
        placeholder={'Add more Tracks'}
        value={searchTerm}
        handleInput={(e) => setSearchTerm(e.target.value)}
        handleSubmit={(e) => {
          if (e.key === 'Enter') {
            addTrack(searchTerm);
            setSearchTerm('');
            e.preventDefault();
          }
        }}
      />
      <SelectionList
        entries={tracks}
        tracks
        toggleSelection={toggleTrackSelection}
      />
      <FloatingButton
        color="primary"
        variant="extended"
        onClick={addTracksToPlaylist}
      >
        Create Playlist
      </FloatingButton>
    </div>
  );
};

export default withRouter(Tracks);
