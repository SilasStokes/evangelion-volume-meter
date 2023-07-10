"use client";
import Image from "next/image";
import { useState, useEffect } from "react";

const styles = {
  parent: {
    margin: 0,
    padding: 0,
  },
  vumeter: {
    position: "relative",
    backgroundColor: "blue",
    aspectRatio: "16 / 9",
    height: "100vh",
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gridTemplateRows: "repeat(27, 1fr)",
    gridColumnGap: "5%",
    gridRowGap: "5px",
    paddingRight: "10%",
    paddingLeft: "10%",
  },
  volumeBars: {
    gridColumn: "3 / 4",
    gridRow: "1 / 22",
    backgroundColor: "red",
    zIndex: 2,
  },
};

export default function VUMeter() {
  const [audioPermissions, setAudioPermissions] = useState(null);
  const [multibandData, setMultibandData] = useState(new Array(4).fill(0));
  useEffect(() => {
    if (!audioPermissions) return;
    const audioContext = new window.AudioContext(); // sample rate is 44100
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(audioPermissions);
    source.connect(analyser);
    // An unsigned integer, representing the window size of the FFT,
    // given in number of samples. A higher value will result in more
    // details in the frequency domain but fewer details in the amplitude domain.
    analyser.fftSize = 256; // set arbitrarily

    const minDecibels = analyser.minDecibels; // -infinity
    const maxDecibels = analyser.maxDecibels; // -0?

    console.log(
      minDecibels,
      maxDecibels,
      analyser.frequencyBinCount,
      audioContext.sampleRate
    );
    const offsetAmnt = 140;
    const mapOfIndexToFrequency = {
      0: { start: 0, end: 2, floor: 6 },
      1: { start: 2, end: 12, floor: 34 },
      2: { start: 12, end: 27, floor: 56 },
      3: { start: 27, end: 256, floor: 400 },
    };

    const tick = () => {
      const dataArray = new Float32Array(analyser.frequencyBinCount);
      const bandSize = dataArray.length / 4;
      analyser.getFloatFrequencyData(dataArray); // frequency range is from 0 to 22050, over 256 bins, so abt 86 hz per bin

      const newMultibandData = new Array(4).fill(0);
      for (let i = 0; i < 4; i++) {
        const curFreqData = dataArray.slice(
          mapOfIndexToFrequency[i].start,
          mapOfIndexToFrequency[i].end
        );
        // const curFreqData = dataArray.slice(i * bandSize, (i + 1) * bandSize); // Each item in the array represents the decibel value for a specific frequency.
        const avgDecibels =
          curFreqData.reduce((acc, curr) => acc + curr, 0) / bandSize;
        if (avgDecibels < -mapOfIndexToFrequency[i].floor) {
          newMultibandData[i] = 0;
          continue;
        } else if (avgDecibels > 0) {
          newMultibandData[i] = 27;
          continue;
        }
        const offsetDecibels = avgDecibels + mapOfIndexToFrequency[i].floor;
        const normalizedVal = Math.floor(
          offsetDecibels / (mapOfIndexToFrequency[i].floor / 27)
        ) + 3;

        newMultibandData[i] = normalizedVal;
      }
      setMultibandData(newMultibandData);

      rafId = requestAnimationFrame(tick);
    };

    let rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      analyser.disconnect();
      source.disconnect();
    };
  }, [audioPermissions]);

  const getMicrophone = async () => {
    const newAudioPermissions = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
    setAudioPermissions(newAudioPermissions);
  };

  const stopMicrophone = () => {
    audioPermissions.getTracks().forEach((track) => track.stop());
    setAudioPermissions(null);
  };

  const toggleMicrophone = () => {
    if (audioPermissions) {
      stopMicrophone();
    } else {
      getMicrophone();
    }
  };

  return (
    // <div className={styles.vumeter}>
    <div style={styles.parent} className="parent">
      <button onClick={toggleMicrophone}>
        {audioPermissions ? "stop mic" : "requestMicrophoneAccess"}
      </button>
      {/* <textarea>{audioData}</textarea> */}
      <div style={styles.vumeter}>
        {multibandData.map((band, hIndex) => {
          return Array.from(Array(band)).map((_, vIndex) => (
            <div
              key={vIndex}
              style={{
                gridColumn: `${hIndex + 2} / ${hIndex + 3}`,
                gridRow: `${27 - vIndex} / ${27 - vIndex + 1}`,
                backgroundColor:
                  band < 13 ? "green" : band < 17 ? "yellow" : "red",
                zIndex: 2,
                boxShadow: `0 0 30px 5px ${
                  band < 13 ? "green" : band < 17 ? "yellow" : "red"
                }`,
                borderRadius: "2px",
              }}
            ></div>
          ));
        })}
        <Image src="/vumeter.svg" alt="VU Meter" fill />
      </div>
    </div>
  );
}
