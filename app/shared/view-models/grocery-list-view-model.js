var config = require("../../shared/config");
var observableArrayModule = require("data/observable-array");

function GroceryListViewModel(items) {
	var viewModel = new observableArrayModule.ObservableArray(items);
	var history = new observableArrayModule.ObservableArray([]);

	viewModel.load = function() {
		return fetch(config.apiUrl + "Groceries", {
			headers: {
				"Authorization": "Bearer " + config.token
			}
		})
		.then(handleErrors)
		.then(function(response) {
			return response.json();
		}).then(function(data) {
			viewModel.empty();
			data.Result.forEach(function(grocery) {
				var destination = grocery.Deleted ? history : viewModel;
				destination.push({
					name: grocery.Name,
					id: grocery.Id,
					deleted: grocery.Deleted,
					done: grocery.Done || false
				});
			});
			viewModel.resetHistory();
		});
	};

	viewModel.empty = function() {
		viewModel.length = 0;
		history.length = 0;
	};

	viewModel.history = function() {
		return history;
	};
	viewModel.toggleDoneHistory = function(index) {
		var item = history.getItem(index);
		history.setItem(index, {
			name: item.name,
			id: item.id,
			deleted: true,
			done: !item.done
		});
	};
	viewModel.resetHistory = function() {
		history.forEach(function(item, index) {
			history.setItem(index, {
				name: item.name,
				id: item.id,
				deleted: true,
				done: false
			});
		});
	};

	viewModel.add = function(grocery) {
		return fetch(config.apiUrl + "Groceries", {
			method: "POST",
			body: JSON.stringify({
				Name: grocery
			}),
			headers: {
				"Authorization": "Bearer " + config.token,
				"Content-Type": "application/json"
			}
		})
		.then(handleErrors)
		.then(function(response) {
			return response.json();
		})
		.then(function(data) {
			viewModel.push({ name: grocery, id: data.Result.Id });
		});
	};

	viewModel.restore = function() {
		var indeces = [];
		var matches = [];
		history.forEach(function(item) {
			if (item.deleted && item.done) {
				indeces.push(item.id);
				matches.push(item);
			}
		});

		return fetch(config.apiUrl + "Groceries", {
			method: "PUT",
			body: JSON.stringify({
				Deleted: false,
				Done: false
			}),
			headers: {
				"Authorization": "Bearer " + config.token,
				"Content-Type": "application/json",
				"X-Everlive-Filter": JSON.stringify({
					"Id": {
						"$in": indeces
					}
				})
			}
		})
		.then(handleErrors)
		.then(function() {
			matches.forEach(function(match) {
				var index = history.indexOf(match);
				match.deleted = false;
				match.done = false;
				history.splice(index, 1);
				viewModel.push(match);
			});
		});
	};

	viewModel.delete = function(index) {
		var item = viewModel.getItem(index);
		viewModel.splice(index, 1);
		item.done = false;
		item.deleted = true;
		history.push(item);

		return fetch(config.apiUrl + "Groceries/" + item.id, {
			method: "PUT",
			body: JSON.stringify({
				Deleted: true
			}),
			headers: {
				"Authorization": "Bearer " + config.token,
				"Content-Type": "application/json"
			}
		})
		.then(handleErrors);
	};

	viewModel.toggleDone = function(index) {
		var item = viewModel.getItem(index);
		item.done = !item.done;
		viewModel.setItem(index, item);

		return fetch(config.apiUrl + "Groceries/" + item.id, {
			method: "PUT",
			body: JSON.stringify({
				Done: item.done
			}),
			headers: {
				"Authorization": "Bearer " + config.token,
				"Content-Type": "application/json"
			}
		})
		.then(handleErrors);
	};

	return viewModel;
}

function handleErrors(response) {
	if (!response.ok) {
		console.log(JSON.stringify(response));
		throw Error(response.statusText);
	}
	return response;
}

module.exports = GroceryListViewModel;