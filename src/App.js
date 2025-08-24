// App.jsx
import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set } from "firebase/database";

// 🔥 VUL HIER JOUW EIGEN FIREBASE CONFIG IN 🔥
const firebaseConfig = {
  apiKey: "AIzaSyBCHb4h3Ja-I7DBv8mTk1BOJEL1gumh7W4",
  authDomain: "gymagenda-70a67.firebaseapp.com",
  databaseURL: "https://gymagenda-70a67-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "gymagenda-70a67",
  storageBucket: "gymagenda-70a67.firebasestorage.app",
  messagingSenderId: "326926305055",
  appId: "1:326926305055:web:bb88f16e80b9d9f7bbd22a"
};

const allowedNames = ["richard", "julia", "herma","marin","martijn","herma"];

// Firebase initialiseren
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Helper: maak array van tijdvakken per kwartier
function getTimeBlocks(start = 5, end = 24) {
  let times = [];
  for (let h = start; h < end; h++) {
    for (let m of [0, 15, 30, 45]) {
      const hourStr = String(h).padStart(2, "0");
      const minStr = String(m).padStart(2, "0");
      times.push(`${hourStr}:${minStr}`);
    }
  }
  return times;
}

const weekDays = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

function getStartOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Maandag als start
  return d;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10); // yyyy-mm-dd
}

export default function App() {
  const [name, setName] = useState("");
  const [inputName, setInputName] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);
  const [bookings, setBookings] = useState({});

  // 🔑 Login
  const handleLogin = (e) => {
    e.preventDefault();
    if (allowedNames.includes(inputName.trim().toLowerCase())) {
      setName(inputName.trim().toLowerCase());
    } else {
      alert("Naam niet toegestaan.");
    }
  };

  // 📅 Weekberekening
  const today = new Date();
  const startOfWeek = getStartOfWeek(
    new Date(today.getFullYear(), today.getMonth(), today.getDate() + weekOffset * 7)
  );
  const dates = [...Array(7)].map((_, i) => {
    let d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    return d;
  });

  // 🔄 Sync met Firebase
  useEffect(() => {
    const weekKey = formatDate(startOfWeek);
    const bookingsRef = ref(db, "bookings/" + weekKey);
    const unsubscribe = onValue(bookingsRef, (snapshot) => {
      setBookings(snapshot.val() || {});
    });
    return () => unsubscribe();
  }, [weekOffset]);

  // 📦 Boek blok (of maak leeg)
  const handleBlockClick = (date, time) => {
    const weekKey = formatDate(startOfWeek);
    const blockPath = `bookings/${weekKey}/${formatDate(date)}/${time.replace(":", "-")}`;
    const blockValue = bookings?.[formatDate(date)]?.[time.replace(":", "-")];
    // Boek blok als leeg, annuleer als eigen naam
    if (!blockValue) {
      set(ref(db, blockPath), name);
    } else if (blockValue === name) {
      set(ref(db, blockPath), null);
    }
    // Anders: niets doen (mag niet boeken als blok bezet is door ander)
  };

  // UI: als niet ingelogd
  if (!name) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <form onSubmit={handleLogin} className="p-6 bg-white rounded-xl shadow-xl flex flex-col gap-4">
          <h2 className="text-xl font-bold mb-2">Log in met je naam</h2>
          <input
            className="border rounded px-3 py-2"
            placeholder="Naam..."
            value={inputName}
            onChange={(e) => setInputName(e.target.value)}
          />
          <button className="bg-blue-600 text-white rounded p-2" type="submit">
            Inloggen
          </button>
        </form>
      </div>
    );
  }

  // UI: kalender
  const timeBlocks = getTimeBlocks();

  return (
    <div className="min-h-screen bg-gray-50 px-2 py-6">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Gezamenlijke Agenda v2</h2>
          <div className="flex gap-2">
            <button className="p-2 bg-gray-200 rounded" onClick={() => setWeekOffset((w) => w - 1)}>
              Vorige
            </button>
            <div className="font-bold px-4 py-2">
              Week van {startOfWeek.toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric" })}
            </div>
            <button className="p-2 bg-gray-200 rounded" onClick={() => setWeekOffset((w) => w + 1)}>
              Volgende
            </button>
          </div>
          <div className="text-gray-500">Ingelogd als: {name}</div>
        </div>
        <div className="overflow-x-auto">
          <table className="table-auto w-full border-collapse">
            <thead>
              <tr>
                <th className="p-1 bg-gray-100 border"></th>
                {dates.map((d, idx) => (
                  <th key={idx} className="p-1 bg-gray-100 border text-center min-w-[120px]">
                    {weekDays[idx]}<br />
                    {d.getDate()}/{d.getMonth() + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeBlocks.map((time, ti) => (
                <tr key={time}>
                  <td className="border px-1 text-right text-xs bg-gray-100">{time}</td>
                  {dates.map((d, di) => {
                    const dateKey = formatDate(d);
                    const timeKey = time.replace(":", "-");
                    const booked = bookings?.[dateKey]?.[timeKey];
                    let cellClass =
                      !booked
                        ? "bg-green-50 hover:bg-green-100 cursor-pointer"
                        : booked === name
                        ? "bg-blue-100 hover:bg-blue-200 cursor-pointer"
                        : "bg-gray-200 text-gray-400";
                    return (
                      <td
                        key={di}
                        className={`border px-1 py-1 text-xs text-center ${cellClass}`}
                        onClick={() => {
                          if (!booked || booked === name) {
                            handleBlockClick(d, time);
                          }
                        }}
                      >
                        {booked ? booked : ""}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-xs mt-4 text-gray-500">
          Klik op een groen vakje om te boeken, nogmaals om te annuleren. Blokje grijs = bezet.
        </div>
      </div>
    </div>
  );
}
