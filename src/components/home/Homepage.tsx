// App.tsx
import React, { useState, useEffect } from "react";
import firebase from "firebase/compat/app";
import "firebase/compat/database";
import firebaseConfig from "../../db/firebase";
import { Button, Input, Stack, Table, Typography } from "@mui/joy";
import styled from "styled-components";
import { columnNameToDisplayName } from "../../utils/textUtils";
import { Movie } from "../../models/Movies";

firebase.initializeApp(firebaseConfig);

const StyledApp = styled.body`
  background-color: lightskyblue;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
`;

const HomePage: React.FC = () => {
  const [title, setTitle] = useState("");
  const [requester, setRequester] = useState("");
  const [dateSubmitted, setDateSubmitted] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [movies, setMovies] = useState<Movie[]>([]);

  useEffect(() => {
    const moviesRef = firebase.database().ref("movies");
    moviesRef.on("value", (snapshot) => {
      const moviesData = snapshot.val();
      if (moviesData) {
        const moviesList = Object.keys(moviesData).map((key) => ({
          id: key,
          ...moviesData[key],
        }));
        setMovies(moviesList);
      } else {
        setMovies([]);
      }
    });
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (title && requester) {
      const moviesRef = firebase.database().ref("movies");
      moviesRef
        .push({
          title,
          requester,
          date_submitted: Date.now(),
        })
        .then(() => {
          setSuccessMessage("Movie suggestion added successfully!");
          setTitle("");
          setRequester("");
          setDateSubmitted("");
          setTimeout(() => {
            setSuccessMessage("");
          }, 3000);
        })
        .catch((error) => {
          setErrorMessage(`Error adding movie suggestion: ${error.message}`);
        });
    } else {
      setErrorMessage("Please fill in all fields.");
    }
  };

  return (
    <StyledApp>
      <Stack justifyContent="center" alignItems="center" spacing={2}>
        <Typography level="h1">Movie List</Typography>
        <form onSubmit={handleSubmit}>
          <Stack>
            <Input
              type="text"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Input
              type="text"
              placeholder="Requester"
              value={requester}
              onChange={(e) => setRequester(e.target.value)}
            />
            <Button type="submit">Submit</Button>
          </Stack>
        </form>
        {successMessage && <p style={{ color: "green" }}>{successMessage}</p>}
        {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
        <Typography>Movie List</Typography>
        <Table aria-label="basic table">
          <thead>
            <tr>
              {movies &&
                movies.length != 0 &&
                Object.keys(movies[0]).map(
                  (key) =>
                    key !== "id" && <th>{columnNameToDisplayName(key)}</th>
                )}
            </tr>
          </thead>
          <tbody>
            {movies.map((movie) => (
              <tr key={movie.id}>
                <td>{movie.title}</td>
                <td>{movie.requester}</td>
                <td>{new Date(movie.date_submitted).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Stack>
    </StyledApp>
  );
};

export default HomePage;
