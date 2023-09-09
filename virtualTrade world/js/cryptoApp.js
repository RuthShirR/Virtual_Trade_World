$(() => {
  const favorites = getFromLocalStorage("favorites") || [];
  let allCoins = [];
  $(async () => {
    try {
      loadSpinner($("main"));
      allCoins = await getDataAsync(
        "https://api.coingecko.com/api/v3/coins/list/"
      );
      allCoins = allCoins.filter(
        (coin) => !coin.id.match(/[0-9]/) && !coin.id.includes("-")
      ).splice(100, 100);
      draw(allCoins, $("#coinContainer"));
      $(liveReport);
    } catch (err) {
      alert(err.message);
    }
  });

  function draw(data, mainDiv) {
    $(".spinner-border").css("display", "none");
    if (!data || typeof mainDiv !== "object") return;

    if (!Array.isArray(data)) {
      if (typeof data !== "object") return;
      return drawCard(data, mainDiv);
    }
    data.forEach((coin) => {
      drawCard(coin, mainDiv);
    });
  }

  const drawCard = (coin, mainDiv) => {
    if (!coin) return; 
    const newCard = $("<div></div>")
    .addClass(["card", "card-design"])
    .attr("id", coin.id || ''); // add default value for id
  const cardBody = $("<div></div>").addClass("card-body");
    // toggle
    const isFavorite = favorites.find((itr) => itr.id === coin.id);
    const checkBox = $("<input/>")
      .attr("type", "checkbox")
      .addClass("toggle-button")
      .attr("checked", isFavorite ? true : false)
      .on("click", function () {
        const index = allCoins.findIndex((index) => index.id === coin.id);
        if (this.checked) {
          if (favorites.length >= 5) {
            loadCards($("#favoritesDiv"), favorites);
            $("#myModal").css("display", "block");
            $("#closeModal").on("click", function () {
              $("#myModal").fadeOut(1000);
              $("#favoritesDiv").html("");
              loadCards($("#coinContainer"), allCoins);
            });
            this.checked = false;
            return;
          }
          favorites.push(allCoins[index]);
        } else {
          const cardRemoved = favorites.findIndex(
            (index) => index.id === coin.id
          );
          favorites.splice(cardRemoved, 1);
        }
        setToLocalStorage("favorites", favorites);
        liveReport();
      });

    const cardTitle = $("<h5></h5>")
      .addClass("card-title")
      .html(coin.symbol.toUpperCase());
    const cardText = $("<p></p>").addClass("card-text").html(coin.name);

    const moreInfoDiv = $("<div></div>")
      .attr("id", `moreInfo-${coin.id}`)
      .addClass("collapse");
    const moreInfoButton = $("<button></button>")
      .addClass(["btn btn-dark", "more-info-button"])
      .html("More Info")
      .on("click", moreInfo);

    cardBody.append(cardTitle, cardText, moreInfoButton, checkBox, moreInfoDiv);
    newCard.append(cardBody);
    mainDiv.append(newCard);
  };

  const moreInfo = async (event) => {
    try {
      const getId = $(event.target).parent().parent().attr("id");
      const cardBody = $(event.target).parent();
      const moreInfoDiv = cardBody.find(`#moreInfo-${getId}`);
      moreInfoDiv.html("");
      $(".spinner-border").remove();
      if (moreInfoDiv.css("display") === "block") {
        moreInfoDiv.css("display", "none");
      } else {
        $(".spinner-border").css("display", "block");
        loadSpinner($(cardBody));
        moreInfoDiv.css("display", "block");
        moreInfoDetails(await handleData(getId), getId);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleData = async (coinId) => {
    const cache = await caches.open("coin-cache");
    const cacheResponse = await cache.match(coinId);
    const cachedData = cacheResponse ? await cacheResponse.json() : null;
    if (!cachedData || !cachedData.coinDetails)
      return await getCoinData(coinId);
    const { coinDetails, clickedAt } = cachedData;
    const now = Date.now();
    if (now > clickedAt + 120000) return await getCoinData(coinId);
    return coinDetails;
  };

  const getCoinData = async (coinId) => {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}`
    );
    const coinDetails = await response.json();
    const clickedAt = Date.now();
    const data = { coinDetails, clickedAt };
    const cache = await caches.open("coin-cache");
    await cache.put(coinId, new Response(JSON.stringify(data)));
    return coinDetails;
  };

  const moreInfoDetails = (coinDetails, cardId) => {
    if (
      !coinDetails ||
      !cardId ||
      !coinDetails.image ||
      !coinDetails.image.small
    )
      return;
    $(".spinner-border").css("display", "none");
    const moreInfoDiv = $(`#moreInfo-${cardId}`);
    const coinImage = $("<img/>").attr("src", coinDetails.image.small);
    const coinPrice = $("<p></p>")
      .html(`USD: ${coinDetails.market_data.current_price.usd} $<br>
                    EUR: ${coinDetails.market_data.current_price.eur} €<br>
                    ILS: ${coinDetails.market_data.current_price.ils} ₪<br>

                    `);

    moreInfoDiv.append(coinImage, coinPrice);
  };
  const handleSearch = () => {
    const searchValue = $("#searchInput").val().trim();
    const searchResult = allCoins.find(
      (coin) => searchValue.toLowerCase() === coin.symbol.toLowerCase()
    );
    $("#coinContainer").empty();

    if (!searchValue) {
      $("#about").css("display", "block");
      draw(allCoins, $("#coinContainer"));
      return;
    }

    if (!searchResult) {
      const noResultsDiv = $("<div></div>")
        .text("No Results !")
        .addClass("noResults");
      $("#coinContainer").append(noResultsDiv);
    } else {
      $("#coinContainer").html("");
      draw(searchResult, $("#coinContainer"));
    }
    $("#coinContainer")[0].scrollIntoView();
    $("#searchInput").val("");
  };

  const loadCards = (currentDiv, coinsArray) => {
    $(currentDiv).html("");
    draw(coinsArray, currentDiv);
  };

  const loadSpinner = (div) => {
    const spinnerDiv = $("<div></div>")
      .addClass("spinner-border")
      .attr("role", "status");
    div.append(spinnerDiv);
  };
  $("#showAbout").on("click", () => $("#about").css("display", "block"));
  $("#showAllCoins").on("click", function () {
    $("#coinContainer").empty();
    draw(allCoins, $("#coinContainer"));
  });
  $("#showAllCoins").on("click", () => $("#coinContainer")[0].scrollIntoView());
  $("#scrollTop").on("click", () => $("header")[0].scrollIntoView());
  $("#searchInput").on("keypress", function (event) {
    if (event.key === "Enter") {
      handleSearch();
    }
  });
  $("#searchButton").on("click", handleSearch);
});

const getFromLocalStorage = (key) => {
  return JSON.parse(localStorage.getItem(key) || "null") || [];
};

const setToLocalStorage = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const getDataAsync = (url) => {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: url,
      success: (data) => resolve(data),
      error: (err) => reject(err),
    });
  });
};

const updateTime = () => {
  const date = new Date();
  const dateString = date.toLocaleDateString();
  const timeString = date.toLocaleTimeString();
  const dateTimeString = dateString + " " + timeString;
  $("#myFooter").text(
    "© All Rights Reserved To Ruth Shir Rosenblum " + dateTimeString
  );
};

updateTime();
setInterval(updateTime, 1000);

const liveReport = () => {
  const favorites = getFromLocalStorage("favorites");
  const selectedCoins = favorites.map((coin) => coin.symbol.toUpperCase());
  const chartData = [];
  const chartTitle = `(${selectedCoins.join(", ")})`;

  const chart = new CanvasJS.Chart("chartContainer", {
    title: {
      text: "Real-time Reports",
    },
    subtitles: [
      {
        text: chartTitle,
      },
    ],
    axisX: {
      title: "Time",
    },
    axisY: [
      {
        title: "Price (USD)",
      },
    ],
    data: chartData,
    willReadFrequently: true, 
  });
  const updateChart = async () => {
    const fsyms = selectedCoins.join(",");
    const tsyms = "USD";
    const apiUrl = `https://min-api.cryptocompare.com/data/pricemulti?fsyms=${fsyms}&tsyms=${tsyms}`;

    try {
      const data = await getDataAsync(apiUrl);

      for (const coinSymbol in data) {
        if (selectedCoins.includes(coinSymbol)) {
          const coinData = data[coinSymbol];
          if (!chartData.find((d) => d.name === coinSymbol)) {
            chartData.push({
              type: "line",
              name: coinSymbol,
              showInLegend: true,
              dataPoints: [],
            });
          }
          const chartSeries = chartData.find((d) => d.name === coinSymbol);
          chartSeries.dataPoints.push({
            x: new Date(),
            y: coinData.USD,
          });
        }
      }
      chart.render();
    } catch (error) {
      console.error(error);
    }
  };

  setInterval(updateChart, 2000);
};
